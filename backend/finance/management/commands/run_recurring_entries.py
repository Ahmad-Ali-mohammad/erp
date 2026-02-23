from __future__ import annotations

import calendar
from datetime import date, datetime, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from finance.models import JournalEntry, JournalEntryRecurringDetail, JournalLine, RecurringEntryTemplate
from finance.services.posting_engine import BASE_CURRENCY, PostingEngine, quantize_money


def add_months(base_date: date, months: int) -> date:
    month_index = base_date.month - 1 + months
    year = base_date.year + month_index // 12
    month = month_index % 12 + 1
    day = min(base_date.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


def compute_next_run_date(base_date: date, frequency: str) -> date:
    if frequency == RecurringEntryTemplate.Frequency.DAILY:
        return base_date + timedelta(days=1)
    if frequency == RecurringEntryTemplate.Frequency.WEEKLY:
        return base_date + timedelta(days=7)
    if frequency == RecurringEntryTemplate.Frequency.MONTHLY:
        return add_months(base_date, 1)
    if frequency == RecurringEntryTemplate.Frequency.QUARTERLY:
        return add_months(base_date, 3)
    return base_date + timedelta(days=1)


def next_entry_number(template_code: str, run_date: date) -> str:
    base = f"REC-{template_code}-{run_date.strftime('%Y%m%d')}"
    candidate = base
    counter = 1
    while JournalEntry.objects.filter(entry_number=candidate).exists():
        candidate = f"{base}-{counter:02d}"
        counter += 1
    return candidate


class Command(BaseCommand):
    help = "Run recurring journal entries for due templates"

    def add_arguments(self, parser):
        parser.add_argument(
            "--as-of-date",
            dest="as_of_date",
            default=None,
            help="Execution date in YYYY-MM-DD format (defaults to today).",
        )

    def handle(self, *args, **options):
        as_of_date_text = options.get("as_of_date")
        as_of_date = datetime.strptime(as_of_date_text, "%Y-%m-%d").date() if as_of_date_text else date.today()

        templates = (
            RecurringEntryTemplate.objects.filter(is_active=True, next_run_date__lte=as_of_date)
            .select_related("project")
            .prefetch_related("lines")
            .order_by("next_run_date", "template_code")
        )

        created_count = 0

        for template in templates:
            run_date = template.next_run_date
            if template.end_date and run_date > template.end_date:
                template.is_active = False
                template.save(update_fields=["is_active", "updated_at"])
                continue

            lines = list(template.lines.all())
            if not lines:
                self.stdout.write(self.style.WARNING(f"Skipping {template.template_code}: no template lines."))
                template.next_run_date = compute_next_run_date(run_date, template.frequency)
                template.save(update_fields=["next_run_date", "updated_at"])
                continue

            try:
                fx_rate = PostingEngine.resolve_fx_rate(template.currency, run_date)
            except Exception as exc:
                self.stdout.write(self.style.ERROR(f"Skipping {template.template_code}: {exc}"))
                continue

            total_debit = Decimal("0.00")
            total_credit = Decimal("0.00")
            lines_payload = []

            for line in lines:
                amount_foreign = quantize_money(line.amount)
                if amount_foreign <= Decimal("0.00"):
                    continue

                amount_base = quantize_money(amount_foreign * fx_rate)
                debit = amount_base if line.side == line.Side.DEBIT else Decimal("0.00")
                credit = amount_base if line.side == line.Side.CREDIT else Decimal("0.00")
                total_debit += debit
                total_credit += credit

                lines_payload.append(
                    {
                        "account": line.account,
                        "description": line.description,
                        "debit": debit,
                        "credit": credit,
                        "debit_foreign": amount_foreign if template.currency != BASE_CURRENCY and debit > 0 else None,
                        "credit_foreign": amount_foreign if template.currency != BASE_CURRENCY and credit > 0 else None,
                        "project": template.project,
                    }
                )

            if not lines_payload:
                self.stdout.write(self.style.WARNING(f"Skipping {template.template_code}: no positive line amounts."))
                template.next_run_date = compute_next_run_date(run_date, template.frequency)
                template.save(update_fields=["next_run_date", "updated_at"])
                continue

            if total_debit != total_credit:
                self.stdout.write(
                    self.style.ERROR(
                        f"Skipping {template.template_code}: unbalanced template ({total_debit} != {total_credit})."
                    )
                )
                continue

            with transaction.atomic():
                entry = JournalEntry.objects.create(
                    entry_number=next_entry_number(template.template_code, run_date),
                    entry_date=run_date,
                    description=f"Recurring entry from template {template.template_code}",
                    status=JournalEntry.Status.POSTED if template.auto_post else JournalEntry.Status.DRAFT,
                    entry_class=JournalEntry.EntryClass.DAILY_RECURRING,
                    currency=template.currency,
                    fx_rate_to_base=fx_rate,
                    period=PostingEngine.resolve_period(run_date),
                    posted_at=datetime.now() if template.auto_post else None,
                    project=template.project,
                    created_by=template.created_by,
                )

                for line_data in lines_payload:
                    JournalLine.objects.create(entry=entry, **line_data)

                JournalEntryRecurringDetail.objects.create(
                    journal_entry=entry,
                    template=template,
                    scheduled_for=run_date,
                    run_reference=f"{template.template_code}:{run_date.isoformat()}",
                )

                template.next_run_date = compute_next_run_date(run_date, template.frequency)
                template.save(update_fields=["next_run_date", "updated_at"])
                created_count += 1

        self.stdout.write(self.style.SUCCESS(f"Created {created_count} recurring entries."))
