from __future__ import annotations

from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from typing import Any

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from core.services.company_profile import get_base_currency
from finance.models import ExchangeRate, FiscalPeriod, JournalEntry, JournalLine, PostingRule


def quantize_money(value: Decimal | int | float | str) -> Decimal:
    return Decimal(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _read_value_path(source: Any, path: str) -> Any:
    current = source
    for part in path.split("."):
        if current is None:
            return None
        if isinstance(current, dict):
            current = current.get(part)
            continue
        current = getattr(current, part, None)
    return current


def _next_auto_entry_number(prefix: str = "AUTO") -> str:
    timestamp_part = timezone.now().strftime("%Y%m%d%H%M%S%f")
    candidate = f"{prefix}-{timestamp_part}"
    counter = 1
    while JournalEntry.objects.filter(entry_number=candidate).exists():
        candidate = f"{prefix}-{timestamp_part}-{counter:02d}"
        counter += 1
    return candidate


class PostingEngine:
    @classmethod
    def resolve_period(cls, entry_date: date) -> FiscalPeriod | None:
        return FiscalPeriod.objects.filter(year=entry_date.year, month=entry_date.month).first()

    @classmethod
    def resolve_fx_rate(cls, currency: str, entry_date: date) -> Decimal:
        base_currency = get_base_currency()
        normalized_currency = (currency or base_currency).upper()
        if normalized_currency == base_currency:
            return Decimal("1.00000000")

        fx = ExchangeRate.objects.filter(
            from_currency=normalized_currency,
            to_currency=base_currency,
            rate_date=entry_date,
        ).first()
        if not fx:
            raise ValidationError(
                {
                    "currency": (
                        f"Missing exchange rate for {normalized_currency}/{base_currency} "
                        f"on {entry_date.isoformat()}. Please add daily exchange rate first."
                    )
                }
            )
        return Decimal(fx.rate)

    @classmethod
    def _resolve_line_amount(cls, source_object: Any, line_rule) -> Decimal:
        if line_rule.fixed_amount is not None:
            return quantize_money(line_rule.fixed_amount)

        source_path = (line_rule.amount_source or "").strip()
        if not source_path:
            raise ValidationError({"posting_rule": f"Rule line {line_rule.id} has no amount source."})

        value = _read_value_path(source_object, source_path)
        if value is None:
            raise ValidationError(
                {
                    "posting_rule": (
                        f"Rule line {line_rule.id} references '{source_path}' but value was empty."
                    )
                }
            )

        try:
            return quantize_money(value)
        except Exception as exc:  # pragma: no cover
            raise ValidationError(
                {
                    "posting_rule": (
                        f"Rule line {line_rule.id} amount source '{source_path}' is not numeric."
                    )
                }
            ) from exc

    @classmethod
    @transaction.atomic
    def post_from_operational_event(
        cls,
        *,
        source_module: str,
        source_event: str,
        source_object: Any,
        entry_date: date,
        description: str,
        posted_by=None,
        idempotency_key: str | None = None,
        entry_class: str = JournalEntry.EntryClass.OPERATIONAL_AUTO,
    ) -> JournalEntry:
        if idempotency_key:
            existing = JournalEntry.objects.filter(idempotency_key=idempotency_key).first()
            if existing:
                return existing

        posting_rule = (
            PostingRule.objects.prefetch_related("lines")
            .filter(source_module=source_module, source_event=source_event, is_active=True)
            .first()
        )
        if not posting_rule:
            raise ValidationError(
                {
                    "posting_rule": (
                        f"No active posting rule configured for source '{source_module}' and event '{source_event}'."
                    )
                }
            )

        if posting_rule.posting_policy == PostingRule.PostingPolicy.MANUAL:
            raise ValidationError(
                {
                    "posting_rule": (
                        f"Posting rule '{posting_rule.name}' is manual and cannot auto-post this event."
                    )
                }
            )

        base_currency = get_base_currency()
        currency = str(getattr(source_object, "currency", base_currency) or base_currency).upper()
        fx_rate = cls.resolve_fx_rate(currency=currency, entry_date=entry_date)
        period = cls.resolve_period(entry_date)
        source_project = getattr(source_object, "project", None)

        lines_payload: list[dict[str, Any]] = []
        total_debit = Decimal("0.00")
        total_credit = Decimal("0.00")

        for line_rule in posting_rule.lines.all():
            amount_foreign = cls._resolve_line_amount(source_object, line_rule)
            if amount_foreign <= Decimal("0.00"):
                continue

            amount_base = quantize_money(amount_foreign * fx_rate)
            line_debit = amount_base if line_rule.side == PostingRuleLineSide.DEBIT else Decimal("0.00")
            line_credit = amount_base if line_rule.side == PostingRuleLineSide.CREDIT else Decimal("0.00")

            total_debit += line_debit
            total_credit += line_credit

            debit_foreign = amount_foreign if currency != base_currency and line_debit > Decimal("0.00") else None
            credit_foreign = amount_foreign if currency != base_currency and line_credit > Decimal("0.00") else None

            lines_payload.append(
                {
                    "account": line_rule.account,
                    "description": line_rule.description_template,
                    "debit": line_debit,
                    "credit": line_credit,
                    "debit_foreign": debit_foreign,
                    "credit_foreign": credit_foreign,
                    "project": source_project,
                }
            )

        if not lines_payload:
            raise ValidationError({"posting_rule": "Posting rule resolved no journal lines."})
        if total_debit != total_credit:
            raise ValidationError(
                {
                    "posting_rule": (
                        f"Auto posting is unbalanced for '{posting_rule.name}' "
                        f"({total_debit} debit vs {total_credit} credit)."
                    )
                }
            )

        entry = JournalEntry.objects.create(
            entry_number=_next_auto_entry_number(),
            entry_date=entry_date,
            description=description,
            status=JournalEntry.Status.POSTED,
            entry_class=entry_class or posting_rule.entry_class,
            source_module=source_module,
            source_object_id=str(getattr(source_object, "id", "")),
            source_event=source_event,
            idempotency_key=idempotency_key,
            currency=currency,
            fx_rate_to_base=fx_rate,
            period=period,
            posted_at=timezone.now(),
            posted_by=posted_by,
            project=source_project,
            created_by=posted_by,
        )

        for line_data in lines_payload:
            JournalLine.objects.create(entry=entry, **line_data)

        return entry


class PostingRuleLineSide:
    DEBIT = "debit"
    CREDIT = "credit"
