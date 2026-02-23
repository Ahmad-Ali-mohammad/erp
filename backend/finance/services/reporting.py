from __future__ import annotations

from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from typing import Any

from django.db.models import Sum

from finance.models import Account, JournalEntry, JournalLine


def quantize_money(value: Decimal | int | float | str) -> Decimal:
    return Decimal(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def decimal_or_zero(value: Decimal | None) -> Decimal:
    return value if value is not None else Decimal("0.00")


def posted_lines_queryset(*, project_id: int | None = None):
    queryset = JournalLine.objects.filter(entry__status=JournalEntry.Status.POSTED)
    if project_id:
        queryset = queryset.filter(entry__project_id=project_id)
    return queryset


def _aggregate_by_account(queryset):
    rows = queryset.values("account_id").annotate(debit=Sum("debit"), credit=Sum("credit"))
    return {
        row["account_id"]: {
            "debit": decimal_or_zero(row["debit"]),
            "credit": decimal_or_zero(row["credit"]),
        }
        for row in rows
    }


def build_trial_balance(*, start_date: date, end_date: date, project_id: int | None = None) -> dict[str, Any]:
    lines_qs = posted_lines_queryset(project_id=project_id)

    opening_map = _aggregate_by_account(lines_qs.filter(entry__entry_date__lt=start_date))
    period_map = _aggregate_by_account(lines_qs.filter(entry__entry_date__gte=start_date, entry__entry_date__lte=end_date))

    account_ids = set(opening_map.keys()) | set(period_map.keys())
    account_map = {account.id: account for account in Account.objects.filter(id__in=account_ids).order_by("code")}

    totals = {
        "opening_debit": Decimal("0.00"),
        "opening_credit": Decimal("0.00"),
        "period_debit": Decimal("0.00"),
        "period_credit": Decimal("0.00"),
        "closing_debit": Decimal("0.00"),
        "closing_credit": Decimal("0.00"),
    }

    rows = []
    for account_id, account in account_map.items():
        opening_debit = opening_map.get(account_id, {}).get("debit", Decimal("0.00"))
        opening_credit = opening_map.get(account_id, {}).get("credit", Decimal("0.00"))
        period_debit = period_map.get(account_id, {}).get("debit", Decimal("0.00"))
        period_credit = period_map.get(account_id, {}).get("credit", Decimal("0.00"))

        opening_balance = opening_debit - opening_credit
        closing_balance = opening_balance + period_debit - period_credit
        closing_debit = closing_balance if closing_balance > 0 else Decimal("0.00")
        closing_credit = -closing_balance if closing_balance < 0 else Decimal("0.00")

        row = {
            "account_id": account.id,
            "account_code": account.code,
            "account_name": account.name,
            "account_type": account.account_type,
            "report_group": account.report_group,
            "opening_debit": quantize_money(opening_debit),
            "opening_credit": quantize_money(opening_credit),
            "period_debit": quantize_money(period_debit),
            "period_credit": quantize_money(period_credit),
            "closing_debit": quantize_money(closing_debit),
            "closing_credit": quantize_money(closing_credit),
        }
        rows.append(row)

        totals["opening_debit"] += row["opening_debit"]
        totals["opening_credit"] += row["opening_credit"]
        totals["period_debit"] += row["period_debit"]
        totals["period_credit"] += row["period_credit"]
        totals["closing_debit"] += row["closing_debit"]
        totals["closing_credit"] += row["closing_credit"]

    for key in list(totals.keys()):
        totals[key] = quantize_money(totals[key])

    return {
        "start_date": start_date,
        "end_date": end_date,
        "project_id": project_id,
        "rows": rows,
        "totals": totals,
        "is_balanced": totals["closing_debit"] == totals["closing_credit"],
    }


def build_general_journal(*, start_date: date, end_date: date, project_id: int | None = None) -> dict[str, Any]:
    queryset = (
        JournalEntry.objects.filter(status=JournalEntry.Status.POSTED, entry_date__gte=start_date, entry_date__lte=end_date)
        .prefetch_related("lines__account")
        .order_by("entry_date", "entry_number")
    )
    if project_id:
        queryset = queryset.filter(project_id=project_id)

    rows = []
    for entry in queryset:
        lines = []
        total_debit = Decimal("0.00")
        total_credit = Decimal("0.00")
        for line in entry.lines.all().order_by("id"):
            line_row = {
                "line_id": line.id,
                "account_id": line.account_id,
                "account_code": line.account.code,
                "account_name": line.account.name,
                "description": line.description,
                "debit": quantize_money(line.debit),
                "credit": quantize_money(line.credit),
                "debit_foreign": quantize_money(line.debit_foreign) if line.debit_foreign is not None else None,
                "credit_foreign": quantize_money(line.credit_foreign) if line.credit_foreign is not None else None,
            }
            total_debit += line_row["debit"]
            total_credit += line_row["credit"]
            lines.append(line_row)

        rows.append(
            {
                "id": entry.id,
                "entry_number": entry.entry_number,
                "entry_date": entry.entry_date,
                "entry_class": entry.entry_class,
                "source_module": entry.source_module,
                "source_event": entry.source_event,
                "description": entry.description,
                "project": entry.project_id,
                "currency": entry.currency,
                "fx_rate_to_base": entry.fx_rate_to_base,
                "lines": lines,
                "total_debit": quantize_money(total_debit),
                "total_credit": quantize_money(total_credit),
            }
        )

    return {
        "start_date": start_date,
        "end_date": end_date,
        "project_id": project_id,
        "rows": rows,
        "count": len(rows),
    }


def build_general_ledger(*, start_date: date, end_date: date, project_id: int | None = None) -> dict[str, Any]:
    lines_qs = posted_lines_queryset(project_id=project_id)
    opening_map = _aggregate_by_account(lines_qs.filter(entry__entry_date__lt=start_date))

    period_lines = (
        lines_qs.filter(entry__entry_date__gte=start_date, entry__entry_date__lte=end_date)
        .select_related("entry", "account")
        .order_by("account__code", "entry__entry_date", "entry__entry_number", "id")
    )

    grouped: dict[int, dict[str, Any]] = {}

    for line in period_lines:
        account_id = line.account_id
        opening_debit = opening_map.get(account_id, {}).get("debit", Decimal("0.00"))
        opening_credit = opening_map.get(account_id, {}).get("credit", Decimal("0.00"))
        opening_balance = opening_debit - opening_credit

        if account_id not in grouped:
            grouped[account_id] = {
                "account_id": account_id,
                "account_code": line.account.code,
                "account_name": line.account.name,
                "account_type": line.account.account_type,
                "opening_balance": quantize_money(opening_balance),
                "period_debit": Decimal("0.00"),
                "period_credit": Decimal("0.00"),
                "closing_balance": quantize_money(opening_balance),
                "movements": [],
            }

        running = Decimal(grouped[account_id]["closing_balance"])
        debit = quantize_money(line.debit)
        credit = quantize_money(line.credit)
        running = quantize_money(running + debit - credit)

        grouped[account_id]["period_debit"] += debit
        grouped[account_id]["period_credit"] += credit
        grouped[account_id]["closing_balance"] = running
        grouped[account_id]["movements"].append(
            {
                "entry_id": line.entry_id,
                "entry_number": line.entry.entry_number,
                "entry_date": line.entry.entry_date,
                "description": line.description or line.entry.description,
                "debit": debit,
                "credit": credit,
                "running_balance": running,
            }
        )

    rows = []
    for group in sorted(grouped.values(), key=lambda item: item["account_code"]):
        group["period_debit"] = quantize_money(group["period_debit"])
        group["period_credit"] = quantize_money(group["period_credit"])
        group["closing_balance"] = quantize_money(group["closing_balance"])
        rows.append(group)

    return {
        "start_date": start_date,
        "end_date": end_date,
        "project_id": project_id,
        "rows": rows,
        "count": len(rows),
    }


def build_balance_sheet(*, as_of_date: date, project_id: int | None = None) -> dict[str, Any]:
    lines_qs = posted_lines_queryset(project_id=project_id).filter(entry__entry_date__lte=as_of_date)
    aggregated = _aggregate_by_account(lines_qs)

    account_map = {
        account.id: account for account in Account.objects.filter(id__in=aggregated.keys()).order_by("code")
    }

    assets = []
    liabilities = []
    equity = []

    assets_total = Decimal("0.00")
    liabilities_total = Decimal("0.00")
    equity_total = Decimal("0.00")

    for account_id, sums in aggregated.items():
        account = account_map.get(account_id)
        if not account:
            continue

        debit = sums["debit"]
        credit = sums["credit"]

        if account.account_type == Account.AccountType.ASSET:
            value = quantize_money(debit - credit)
            if value == Decimal("0.00"):
                continue
            assets.append({"account_id": account.id, "code": account.code, "name": account.name, "amount": value})
            assets_total += value
        elif account.account_type == Account.AccountType.LIABILITY:
            value = quantize_money(credit - debit)
            if value == Decimal("0.00"):
                continue
            liabilities.append({"account_id": account.id, "code": account.code, "name": account.name, "amount": value})
            liabilities_total += value
        elif account.account_type == Account.AccountType.EQUITY:
            value = quantize_money(credit - debit)
            if value == Decimal("0.00"):
                continue
            equity.append({"account_id": account.id, "code": account.code, "name": account.name, "amount": value})
            equity_total += value

    assets_total = quantize_money(assets_total)
    liabilities_total = quantize_money(liabilities_total)
    equity_total = quantize_money(equity_total)
    equation_gap = quantize_money(assets_total - (liabilities_total + equity_total))

    return {
        "as_of_date": as_of_date,
        "project_id": project_id,
        "assets": assets,
        "liabilities": liabilities,
        "equity": equity,
        "totals": {
            "assets": assets_total,
            "liabilities": liabilities_total,
            "equity": equity_total,
            "equation_gap": equation_gap,
            "is_balanced": equation_gap == Decimal("0.00"),
        },
    }


def build_income_statement(*, start_date: date, end_date: date, project_id: int | None = None) -> dict[str, Any]:
    lines_qs = posted_lines_queryset(project_id=project_id).filter(entry__entry_date__gte=start_date, entry__entry_date__lte=end_date)
    aggregated = _aggregate_by_account(lines_qs)
    account_map = {
        account.id: account for account in Account.objects.filter(id__in=aggregated.keys()).order_by("code")
    }

    revenues = []
    expenses = []
    total_revenue = Decimal("0.00")
    total_expense = Decimal("0.00")

    for account_id, sums in aggregated.items():
        account = account_map.get(account_id)
        if not account:
            continue
        debit = sums["debit"]
        credit = sums["credit"]

        if account.account_type == Account.AccountType.REVENUE:
            amount = quantize_money(credit - debit)
            if amount == Decimal("0.00"):
                continue
            revenues.append({"account_id": account.id, "code": account.code, "name": account.name, "amount": amount})
            total_revenue += amount
        elif account.account_type == Account.AccountType.EXPENSE:
            amount = quantize_money(debit - credit)
            if amount == Decimal("0.00"):
                continue
            expenses.append({"account_id": account.id, "code": account.code, "name": account.name, "amount": amount})
            total_expense += amount

    total_revenue = quantize_money(total_revenue)
    total_expense = quantize_money(total_expense)
    net_profit_or_loss = quantize_money(total_revenue - total_expense)

    return {
        "start_date": start_date,
        "end_date": end_date,
        "project_id": project_id,
        "revenues": revenues,
        "expenses": expenses,
        "summary": {
            "total_revenue": total_revenue,
            "total_expense": total_expense,
            "net_profit_or_loss": net_profit_or_loss,
        },
    }
