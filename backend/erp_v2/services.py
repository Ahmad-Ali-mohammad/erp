from __future__ import annotations

import csv
import io
import os
from datetime import date, timedelta
from decimal import Decimal

from django.db import models, transaction
from django.db.models import Sum
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from core.services.sequence import next_sequence
from finance.models import FiscalPeriod

from .models import (
    BankReconciliationSession,
    BankStatement,
    GLEntry,
    GLEntryLine,
    GLAccount,
    InventoryAdjustment,
    InventoryLocation,
    InventoryMovement,
    MasterItem,
    MasterCustomer,
    MasterVendor,
    PostingRuleLine,
    PurchaseInvoice,
    PurchaseOrder,
    PurchaseReceipt,
    PurchaseReceiptLine,
    SalesInvoice,
    SalesOrder,
    SalesQuotation,
    TreasuryPayment,
    TreasuryReceipt,
)


def _period_is_hard_closed(entry_date: date) -> bool:
    period = FiscalPeriod.objects.filter(year=entry_date.year, month=entry_date.month).first()
    return bool(period and period.status == FiscalPeriod.Status.HARD_CLOSED)


def _strict_mode_enabled() -> bool:
    return os.getenv("POSTING_V2_MODE", "compat").strip().lower() == "strict"


def _get_account(code: str, account_type: str, fallback_name: str) -> GLAccount:
    account = GLAccount.objects.filter(code=code).first()
    if account:
        return account
    if _strict_mode_enabled():
        raise ValidationError({"posting": f"Required account {code} is missing in strict mode."})
    return GLAccount.objects.create(
        code=code,
        name=fallback_name,
        account_type=account_type,
        level=1,
        is_postable=True,
    )


def ensure_default_accounts() -> dict[str, GLAccount]:
    return {
        "ar": _get_account("1100", GLAccount.AccountType.ASSET, "Accounts Receivable"),
        "cash": _get_account("1110", GLAccount.AccountType.ASSET, "Cash"),
        "bank": _get_account("1120", GLAccount.AccountType.ASSET, "Bank"),
        "inventory": _get_account("1200", GLAccount.AccountType.ASSET, "Inventory"),
        "ap": _get_account("2100", GLAccount.AccountType.LIABILITY, "Accounts Payable"),
        "sales": _get_account("4100", GLAccount.AccountType.REVENUE, "Sales"),
        "cogs": _get_account("5100", GLAccount.AccountType.EXPENSE, "Cost of Goods Sold"),
        "inventory_gain": _get_account("4190", GLAccount.AccountType.REVENUE, "Inventory Adjustment Gain"),
        "inventory_loss": _get_account("5190", GLAccount.AccountType.EXPENSE, "Inventory Adjustment Loss"),
        "purchases": _get_account("5200", GLAccount.AccountType.EXPENSE, "Purchases"),
    }


def _next_entry_number(prefix: str = "GLV2") -> str:
    return next_sequence(f"erp_v2_{prefix.lower()}_entry", prefix=f"{prefix}-", padding=7)


def _next_document_number(prefix: str) -> str:
    return next_sequence(f"erp_v2_{prefix.lower()}_document", prefix=f"{prefix}-", padding=7)


def _ensure_maker_checker(created_by_id, checker_id):
    if created_by_id and checker_id and created_by_id == checker_id:
        raise ValidationError({"maker_checker": "Maker and checker cannot be the same user."})


def _build_posting_lines_from_rules(
    *,
    source_type: str,
    amount_context: dict[str, Decimal],
    default_lines: list[dict],
) -> list[dict]:
    rule_lines = list(
        PostingRuleLine.objects.select_related("rule", "account")
        .filter(rule__source_type=source_type, rule__is_active=True)
        .order_by("id")
    )
    if not rule_lines:
        if _strict_mode_enabled():
            raise ValidationError({"posting": f"Missing posting rule for source '{source_type}' in strict mode."})
        return default_lines

    lines: list[dict] = []
    for rule_line in rule_lines:
        amount = amount_context.get(rule_line.amount_field)
        if amount is None:
            if _strict_mode_enabled() or rule_line.rule.strict:
                raise ValidationError(
                    {"posting": f"Amount field '{rule_line.amount_field}' not found for source '{source_type}'."}
                )
            continue
        amount = Decimal(str(amount))
        if amount <= Decimal("0.00"):
            continue
        if rule_line.side == PostingRuleLine.Side.DEBIT:
            lines.append({"account": rule_line.account, "debit": amount, "credit": Decimal("0.00")})
        else:
            lines.append({"account": rule_line.account, "debit": Decimal("0.00"), "credit": amount})

    if not lines:
        if _strict_mode_enabled():
            raise ValidationError({"posting": f"Posting rule for '{source_type}' produced no lines in strict mode."})
        return default_lines
    return lines


def create_inventory_movement(
    *,
    item: MasterItem,
    location: InventoryLocation,
    movement_type: str,
    quantity: Decimal,
    unit_cost: Decimal,
    movement_date: date,
    reference_type: str,
    reference_id: str,
):
    if quantity <= Decimal("0.000"):
        raise ValidationError({"quantity": "Quantity must be greater than zero."})

    if movement_type == InventoryMovement.MovementType.OUT:
        inbound = (
            InventoryMovement.objects.filter(
                item=item,
                location=location,
                movement_type__in=[InventoryMovement.MovementType.IN, InventoryMovement.MovementType.ADJUSTMENT],
            ).aggregate(total=Sum("quantity"))["total"]
            or Decimal("0.000")
        )
        outbound = (
            InventoryMovement.objects.filter(
                item=item,
                location=location,
                movement_type=InventoryMovement.MovementType.OUT,
            ).aggregate(total=Sum("quantity"))["total"]
            or Decimal("0.000")
        )
        available = inbound - outbound
        if available < quantity:
            raise ValidationError({"stock": f"Insufficient stock for item {item.sku}. Available {available}."})

    return InventoryMovement.objects.create(
        item=item,
        location=location,
        movement_type=movement_type,
        quantity=quantity,
        unit_cost=unit_cost,
        movement_date=movement_date,
        reference_type=reference_type,
        reference_id=reference_id,
    )


def post_gl_entry(*, entry: GLEntry, posted_by):
    if entry.status == GLEntry.Status.POSTED:
        return entry
    _ensure_maker_checker(entry.created_by_id, getattr(posted_by, "id", None))
    if _period_is_hard_closed(entry.entry_date):
        raise ValidationError({"entry_date": "Cannot post entry in hard-closed period."})

    debit = entry.lines.aggregate(total=Sum("debit"))["total"] or Decimal("0.00")
    credit = entry.lines.aggregate(total=Sum("credit"))["total"] or Decimal("0.00")
    if debit != credit:
        raise ValidationError({"lines": "Entry is not balanced."})

    entry.status = GLEntry.Status.POSTED
    entry.posted_by = posted_by
    entry.posted_at = timezone.now()
    entry.save(update_fields=["status", "posted_by", "posted_at", "updated_at"])
    return entry


def _assert_entry_balanced(entry: GLEntry):
    debit = entry.lines.aggregate(total=Sum("debit"))["total"] or Decimal("0.00")
    credit = entry.lines.aggregate(total=Sum("credit"))["total"] or Decimal("0.00")
    if debit != credit:
        raise ValidationError({"posting": f"Generated entry {entry.entry_number} is not balanced."})


@transaction.atomic
def auto_post_sales_invoice(
    invoice: SalesInvoice,
    *,
    location: InventoryLocation | None,
    posted_by,
    enforce_maker_checker: bool = True,
):
    accounts = ensure_default_accounts()
    if invoice.status == SalesInvoice.Status.POSTED:
        return None
    if enforce_maker_checker:
        _ensure_maker_checker(invoice.created_by_id, getattr(posted_by, "id", None))
    if _period_is_hard_closed(invoice.invoice_date):
        raise ValidationError({"invoice_date": "Cannot post invoice in hard-closed period."})

    subtotal = Decimal("0.00")
    cogs_total = Decimal("0.00")
    for line in invoice.lines.select_related("item"):
        line_value = line.quantity * line.unit_price
        subtotal += line_value
        cost = line.quantity * line.item.standard_cost
        cogs_total += cost
        if line.item.track_inventory:
            if not location:
                raise ValidationError({"location": "Inventory location is required for stock items."})
            create_inventory_movement(
                item=line.item,
                location=location,
                movement_type=InventoryMovement.MovementType.OUT,
                quantity=line.quantity,
                unit_cost=line.item.standard_cost,
                movement_date=invoice.invoice_date,
                reference_type="sales_invoice",
                reference_id=str(invoice.id),
            )

    invoice.subtotal = subtotal
    invoice.total_amount = subtotal + (invoice.tax_amount or Decimal("0.00"))
    invoice.status = SalesInvoice.Status.POSTED
    invoice.posted_by = posted_by
    invoice.posted_at = timezone.now()
    invoice.save(update_fields=["subtotal", "total_amount", "status", "posted_by", "posted_at", "updated_at"])

    entry = GLEntry.objects.create(
        entry_number=_next_entry_number(),
        entry_date=invoice.invoice_date,
        description=f"Sales invoice {invoice.invoice_number}",
        source_type="sales_invoice",
        source_id=str(invoice.id),
        status=GLEntry.Status.POSTED,
        created_by=posted_by,
        posted_by=posted_by,
        posted_at=timezone.now(),
    )
    ar_or_cash_account = accounts["cash"] if invoice.invoice_type == SalesInvoice.InvoiceType.CASH else accounts["ar"]
    default_lines = [
        {"account": ar_or_cash_account, "debit": invoice.total_amount, "credit": Decimal("0.00")},
        {"account": accounts["sales"], "debit": Decimal("0.00"), "credit": invoice.total_amount},
    ]
    if cogs_total > Decimal("0.00"):
        default_lines.extend(
            [
                {"account": accounts["cogs"], "debit": cogs_total, "credit": Decimal("0.00")},
                {"account": accounts["inventory"], "debit": Decimal("0.00"), "credit": cogs_total},
            ]
        )

    posting_lines = _build_posting_lines_from_rules(
        source_type="sales_invoice",
        amount_context={
            "total_amount": invoice.total_amount,
            "subtotal": subtotal,
            "tax_amount": invoice.tax_amount or Decimal("0.00"),
            "cogs_total": cogs_total,
        },
        default_lines=default_lines,
    )
    for line in posting_lines:
        GLEntryLine.objects.create(
            entry=entry,
            account=line["account"],
            customer=invoice.customer,
            cost_center=invoice.cost_center,
            debit=line["debit"],
            credit=line["credit"],
        )
    _assert_entry_balanced(entry)

    return entry


@transaction.atomic
def auto_post_purchase_invoice(invoice: PurchaseInvoice, *, posted_by):
    accounts = ensure_default_accounts()
    if invoice.status == PurchaseInvoice.Status.POSTED:
        return None
    _ensure_maker_checker(invoice.created_by_id, getattr(posted_by, "id", None))
    if _period_is_hard_closed(invoice.invoice_date):
        raise ValidationError({"invoice_date": "Cannot post invoice in hard-closed period."})

    subtotal = Decimal("0.00")
    for line in invoice.lines.all():
        subtotal += line.quantity * line.unit_cost

    invoice.subtotal = subtotal
    invoice.total_amount = subtotal + (invoice.tax_amount or Decimal("0.00"))
    invoice.status = PurchaseInvoice.Status.POSTED
    invoice.posted_by = posted_by
    invoice.posted_at = timezone.now()
    invoice.save(update_fields=["subtotal", "total_amount", "status", "posted_by", "posted_at", "updated_at"])

    entry = GLEntry.objects.create(
        entry_number=_next_entry_number(),
        entry_date=invoice.invoice_date,
        description=f"Purchase invoice {invoice.invoice_number}",
        source_type="purchase_invoice",
        source_id=str(invoice.id),
        status=GLEntry.Status.POSTED,
        created_by=posted_by,
        posted_by=posted_by,
        posted_at=timezone.now(),
    )
    posting_lines = _build_posting_lines_from_rules(
        source_type="purchase_invoice",
        amount_context={
            "total_amount": invoice.total_amount,
            "subtotal": subtotal,
            "tax_amount": invoice.tax_amount or Decimal("0.00"),
        },
        default_lines=[
            {"account": accounts["inventory"], "debit": invoice.total_amount, "credit": Decimal("0.00")},
            {"account": accounts["ap"], "debit": Decimal("0.00"), "credit": invoice.total_amount},
        ],
    )
    for line in posting_lines:
        GLEntryLine.objects.create(
            entry=entry,
            account=line["account"],
            vendor=invoice.vendor,
            debit=line["debit"],
            credit=line["credit"],
        )
    _assert_entry_balanced(entry)
    return entry


@transaction.atomic
def receive_purchase_order(*, purchase_order: PurchaseOrder, lines_payload: list[dict], location: InventoryLocation, receipt_date: date, performed_by):
    if purchase_order.status not in {PurchaseOrder.Status.DRAFT, PurchaseOrder.Status.SENT}:
        raise ValidationError({"status": "Purchase order cannot be received in this status."})
    if _period_is_hard_closed(receipt_date):
        raise ValidationError({"receipt_date": "Cannot receive goods in hard-closed period."})

    order_lines = {line.id: line for line in purchase_order.lines.select_for_update().select_related("item")}
    if not order_lines:
        raise ValidationError({"lines": "Purchase order has no lines."})

    receipt = PurchaseReceipt.objects.create(
        receipt_number=_next_document_number("GRN"),
        purchase_order=purchase_order,
        location=location,
        receipt_date=receipt_date,
    )

    applied = 0
    for raw in lines_payload:
        line_id_raw = raw.get("line_id") or raw.get("id")
        try:
            line_id = int(line_id_raw)
        except (TypeError, ValueError):
            raise ValidationError({"lines": f"Invalid line id: {line_id_raw}"})
        qty = Decimal(str(raw.get("quantity", "0")))
        if qty <= Decimal("0.000"):
            continue

        order_line = order_lines.get(line_id)
        if not order_line:
            raise ValidationError({"lines": f"Line {line_id} is not part of this order."})

        remaining = order_line.quantity - order_line.received_quantity
        if qty > remaining:
            raise ValidationError({"lines": f"Received quantity exceeds remaining quantity for line {line_id}."})

        order_line.received_quantity += qty
        order_line.save(update_fields=["received_quantity", "updated_at"])

        PurchaseReceiptLine.objects.create(
            receipt=receipt,
            item=order_line.item,
            quantity=qty,
            unit_cost=order_line.unit_cost,
        )

        if order_line.item.track_inventory:
            create_inventory_movement(
                item=order_line.item,
                location=location,
                movement_type=InventoryMovement.MovementType.IN,
                quantity=qty,
                unit_cost=order_line.unit_cost,
                movement_date=receipt_date,
                reference_type="purchase_receipt",
                reference_id=str(receipt.id),
            )
        applied += 1

    if applied == 0:
        raise ValidationError({"lines": "No valid receive lines provided."})

    all_received = all(line.received_quantity >= line.quantity for line in purchase_order.lines.all())
    purchase_order.status = PurchaseOrder.Status.RECEIVED if all_received else PurchaseOrder.Status.SENT
    purchase_order.save(update_fields=["status", "updated_at"])

    return receipt


@transaction.atomic
def register_treasury_receipt(*, payload: dict, performed_by):
    accounts = ensure_default_accounts()
    invoice: SalesInvoice = payload["sales_invoice"]
    amount = Decimal(str(payload["amount"]))
    receipt_date = payload["receipt_date"]

    if amount <= Decimal("0.00"):
        raise ValidationError({"amount": "Amount must be greater than zero."})
    if _period_is_hard_closed(receipt_date):
        raise ValidationError({"receipt_date": "Cannot record receipt in hard-closed period."})
    if invoice.status not in {SalesInvoice.Status.POSTED, SalesInvoice.Status.PARTIALLY_PAID}:
        raise ValidationError({"sales_invoice": "Invoice must be posted before receipt."})

    open_balance = (invoice.total_amount or Decimal("0.00")) - (invoice.paid_amount or Decimal("0.00"))
    if amount > open_balance:
        raise ValidationError({"amount": "Amount exceeds invoice open balance."})

    obj = TreasuryReceipt.objects.create(**payload)

    invoice.paid_amount = (invoice.paid_amount or Decimal("0.00")) + amount
    if invoice.paid_amount >= invoice.total_amount:
        invoice.status = SalesInvoice.Status.PAID
    elif invoice.paid_amount > Decimal("0.00"):
        invoice.status = SalesInvoice.Status.PARTIALLY_PAID
    invoice.save(update_fields=["paid_amount", "status", "updated_at"])

    bank_or_cash = accounts["bank"] if obj.channel == TreasuryReceipt.Channel.BANK else accounts["cash"]
    entry = GLEntry.objects.create(
        entry_number=_next_entry_number("RCPT"),
        entry_date=obj.receipt_date,
        description=f"Treasury receipt {obj.receipt_number}",
        source_type="treasury_receipt",
        source_id=str(obj.id),
        status=GLEntry.Status.POSTED,
        created_by=performed_by,
        posted_by=performed_by,
        posted_at=timezone.now(),
    )
    posting_lines = _build_posting_lines_from_rules(
        source_type="treasury_receipt",
        amount_context={"amount": amount},
        default_lines=[
            {"account": bank_or_cash, "debit": amount, "credit": Decimal("0.00")},
            {"account": accounts["ar"], "debit": Decimal("0.00"), "credit": amount},
        ],
    )
    for line in posting_lines:
        GLEntryLine.objects.create(
            entry=entry,
            account=line["account"],
            customer=obj.customer,
            debit=line["debit"],
            credit=line["credit"],
        )
    _assert_entry_balanced(entry)
    return obj


@transaction.atomic
def register_treasury_payment(*, payload: dict, performed_by):
    accounts = ensure_default_accounts()
    invoice: PurchaseInvoice = payload["purchase_invoice"]
    amount = Decimal(str(payload["amount"]))
    payment_date = payload["payment_date"]

    if amount <= Decimal("0.00"):
        raise ValidationError({"amount": "Amount must be greater than zero."})
    if _period_is_hard_closed(payment_date):
        raise ValidationError({"payment_date": "Cannot record payment in hard-closed period."})
    if invoice.status not in {PurchaseInvoice.Status.POSTED, PurchaseInvoice.Status.PARTIALLY_PAID}:
        raise ValidationError({"purchase_invoice": "Invoice must be posted before payment."})

    open_balance = (invoice.total_amount or Decimal("0.00")) - (invoice.paid_amount or Decimal("0.00"))
    if amount > open_balance:
        raise ValidationError({"amount": "Amount exceeds invoice open balance."})

    obj = TreasuryPayment.objects.create(**payload)

    invoice.paid_amount = (invoice.paid_amount or Decimal("0.00")) + amount
    if invoice.paid_amount >= invoice.total_amount:
        invoice.status = PurchaseInvoice.Status.PAID
    elif invoice.paid_amount > Decimal("0.00"):
        invoice.status = PurchaseInvoice.Status.PARTIALLY_PAID
    invoice.save(update_fields=["paid_amount", "status", "updated_at"])

    bank_or_cash = accounts["bank"] if obj.channel == TreasuryPayment.Channel.BANK else accounts["cash"]
    entry = GLEntry.objects.create(
        entry_number=_next_entry_number("PMT"),
        entry_date=obj.payment_date,
        description=f"Treasury payment {obj.payment_number}",
        source_type="treasury_payment",
        source_id=str(obj.id),
        status=GLEntry.Status.POSTED,
        created_by=performed_by,
        posted_by=performed_by,
        posted_at=timezone.now(),
    )
    posting_lines = _build_posting_lines_from_rules(
        source_type="treasury_payment",
        amount_context={"amount": amount},
        default_lines=[
            {"account": accounts["ap"], "debit": amount, "credit": Decimal("0.00")},
            {"account": bank_or_cash, "debit": Decimal("0.00"), "credit": amount},
        ],
    )
    for line in posting_lines:
        GLEntryLine.objects.create(
            entry=entry,
            account=line["account"],
            vendor=obj.vendor,
            debit=line["debit"],
            credit=line["credit"],
        )
    _assert_entry_balanced(entry)
    return obj


@transaction.atomic
def apply_inventory_adjustment(*, adjustment: InventoryAdjustment, performed_by):
    accounts = ensure_default_accounts()
    if _period_is_hard_closed(adjustment.adjustment_date):
        raise ValidationError({"adjustment_date": "Cannot adjust inventory in hard-closed period."})

    if adjustment.direction == InventoryAdjustment.Direction.DECREASE:
        create_inventory_movement(
            item=adjustment.item,
            location=adjustment.location,
            movement_type=InventoryMovement.MovementType.OUT,
            quantity=adjustment.quantity,
            unit_cost=adjustment.unit_cost,
            movement_date=adjustment.adjustment_date,
            reference_type="inventory_adjustment",
            reference_id=str(adjustment.id),
        )
        debit_account = accounts["inventory_loss"]
        credit_account = accounts["inventory"]
    else:
        create_inventory_movement(
            item=adjustment.item,
            location=adjustment.location,
            movement_type=InventoryMovement.MovementType.ADJUSTMENT,
            quantity=adjustment.quantity,
            unit_cost=adjustment.unit_cost,
            movement_date=adjustment.adjustment_date,
            reference_type="inventory_adjustment",
            reference_id=str(adjustment.id),
        )
        debit_account = accounts["inventory"]
        credit_account = accounts["inventory_gain"]

    amount = adjustment.quantity * adjustment.unit_cost
    entry = GLEntry.objects.create(
        entry_number=_next_entry_number("ADJ"),
        entry_date=adjustment.adjustment_date,
        description=f"Inventory adjustment {adjustment.adjustment_number}",
        source_type="inventory_adjustment",
        source_id=str(adjustment.id),
        status=GLEntry.Status.POSTED,
        created_by=performed_by,
        posted_by=performed_by,
        posted_at=timezone.now(),
    )
    posting_lines = _build_posting_lines_from_rules(
        source_type="inventory_adjustment",
        amount_context={"amount": amount},
        default_lines=[
            {"account": debit_account, "debit": amount, "credit": Decimal("0.00")},
            {"account": credit_account, "debit": Decimal("0.00"), "credit": amount},
        ],
    )
    for line in posting_lines:
        GLEntryLine.objects.create(
            entry=entry,
            account=line["account"],
            item=adjustment.item,
            debit=line["debit"],
            credit=line["credit"],
        )
    _assert_entry_balanced(entry)


def parse_bank_csv(file_obj) -> list[dict]:
    content = file_obj.read()
    if isinstance(content, bytes):
        content = content.decode("utf-8-sig")
    stream = io.StringIO(content)
    reader = csv.DictReader(stream)

    required = {"date", "description", "reference", "amount"}
    headers = {header.strip().lower() for header in (reader.fieldnames or [])}
    if not required.issubset(headers):
        raise ValidationError({"file": "CSV must include columns: date, description, reference, amount."})

    rows = []
    for row in reader:
        raw_date = str(row.get("date") or row.get("Date") or "").strip()
        if not raw_date:
            continue
        try:
            txn_date = date.fromisoformat(raw_date)
        except ValueError:
            raise ValidationError({"file": f"Invalid date value '{raw_date}'. Use YYYY-MM-DD."})
        raw_amount = str(row.get("amount") or row.get("Amount") or "0").strip()
        rows.append(
            {
                "txn_date": txn_date,
                "description": row.get("description") or row.get("Description") or "",
                "reference": row.get("reference") or row.get("Reference") or "",
                "amount": Decimal(raw_amount),
            }
        )
    return rows


def run_bank_reconciliation(*, statement: BankStatement) -> BankReconciliationSession:
    candidate_entries = GLEntry.objects.filter(status=GLEntry.Status.POSTED).prefetch_related("lines")

    matched = 0
    for line in statement.lines.filter(matched=False):
        line_date = line.txn_date
        amount = abs(line.amount)
        date_from = line_date - timedelta(days=3)
        date_to = line_date + timedelta(days=3)

        matched_entry = None
        matched_source_type = ""

        receipt = (
            TreasuryReceipt.objects.filter(receipt_date__range=(date_from, date_to), amount=amount)
            .order_by("id")
            .first()
        )
        if receipt:
            matched_entry = GLEntry.objects.filter(source_type="treasury_receipt", source_id=str(receipt.id)).first()
            matched_source_type = "treasury_receipt"

        if not matched_entry:
            payment = (
                TreasuryPayment.objects.filter(payment_date__range=(date_from, date_to), amount=amount)
                .order_by("id")
                .first()
            )
            if payment:
                matched_entry = GLEntry.objects.filter(source_type="treasury_payment", source_id=str(payment.id)).first()
                matched_source_type = "treasury_payment"

        if not matched_entry:
            for entry in candidate_entries.filter(entry_date__gte=date_from, entry_date__lte=date_to):
                line_totals = entry.lines.filter(
                    models.Q(debit=amount) | models.Q(credit=amount),
                    account__code__in=["1110", "1120"],
                )
                if line_totals.exists():
                    matched_entry = entry
                    matched_source_type = entry.source_type or "gl_entry"
                    break

        if matched_entry:
            line.matched = True
            line.matched_entry = matched_entry
            line.matched_source_type = matched_source_type
            line.save(update_fields=["matched", "matched_entry", "matched_source_type", "updated_at"])
            matched += 1

    unmatched = statement.lines.filter(matched=False).count()
    return BankReconciliationSession.objects.create(
        statement=statement,
        matched_count=matched,
        unmatched_count=unmatched,
    )


def _posted_lines_queryset(start_date: date | None = None, end_date: date | None = None):
    qs = GLEntryLine.objects.filter(entry__status=GLEntry.Status.POSTED).select_related("account", "customer", "vendor", "item", "cost_center")
    if start_date:
        qs = qs.filter(entry__entry_date__gte=start_date)
    if end_date:
        qs = qs.filter(entry__entry_date__lte=end_date)
    return qs


def build_trial_balance(*, start_date: date | None = None, end_date: date | None = None):
    lines = _posted_lines_queryset(start_date=start_date, end_date=end_date)
    by_account = lines.values("account_id", "account__code", "account__name").annotate(
        debit=Sum("debit"),
        credit=Sum("credit"),
    ).order_by("account__code")

    total_debit = Decimal("0.00")
    total_credit = Decimal("0.00")
    rows = []
    for row in by_account:
        debit = row["debit"] or Decimal("0.00")
        credit = row["credit"] or Decimal("0.00")
        total_debit += debit
        total_credit += credit
        rows.append(
            {
                "account_id": row["account_id"],
                "account_code": row["account__code"],
                "account_name": row["account__name"],
                "debit": debit,
                "credit": credit,
            }
        )

    return {
        "rows": rows,
        "totals": {"debit": total_debit, "credit": total_credit, "is_balanced": total_debit == total_credit},
    }


def build_income_statement(*, start_date: date | None = None, end_date: date | None = None):
    lines = _posted_lines_queryset(start_date=start_date, end_date=end_date)
    grouped = lines.values("account__account_type").annotate(debit=Sum("debit"), credit=Sum("credit"))

    revenue = Decimal("0.00")
    expense = Decimal("0.00")
    for row in grouped:
        account_type = row["account__account_type"]
        debit = row["debit"] or Decimal("0.00")
        credit = row["credit"] or Decimal("0.00")
        if account_type == GLAccount.AccountType.REVENUE:
            revenue += credit - debit
        elif account_type == GLAccount.AccountType.EXPENSE:
            expense += debit - credit

    return {
        "summary": {
            "total_revenue": revenue,
            "total_expense": expense,
            "net_profit_or_loss": revenue - expense,
        }
    }


def build_balance_sheet(*, as_of_date: date | None = None):
    lines = _posted_lines_queryset(end_date=as_of_date)
    grouped = lines.values("account__account_type").annotate(debit=Sum("debit"), credit=Sum("credit"))

    assets = Decimal("0.00")
    liabilities = Decimal("0.00")
    equity = Decimal("0.00")

    for row in grouped:
        account_type = row["account__account_type"]
        debit = row["debit"] or Decimal("0.00")
        credit = row["credit"] or Decimal("0.00")
        if account_type == GLAccount.AccountType.ASSET:
            assets += debit - credit
        elif account_type == GLAccount.AccountType.LIABILITY:
            liabilities += credit - debit
        elif account_type == GLAccount.AccountType.EQUITY:
            equity += credit - debit

    return {
        "totals": {
            "assets": assets,
            "liabilities": liabilities,
            "equity": equity,
            "equation_gap": assets - (liabilities + equity),
            "is_balanced": assets == (liabilities + equity),
        }
    }


def build_ar_aging(*, as_of_date: date | None = None):
    as_of_date = as_of_date or timezone.localdate()
    buckets = {"0-30": Decimal("0.00"), "31-60": Decimal("0.00"), "61-90": Decimal("0.00"), "91-120": Decimal("0.00"), "120+": Decimal("0.00")}
    rows = []
    for invoice in SalesInvoice.objects.select_related("customer").filter(status__in=[SalesInvoice.Status.POSTED, SalesInvoice.Status.PARTIALLY_PAID]):
        open_amount = (invoice.total_amount or Decimal("0.00")) - (invoice.paid_amount or Decimal("0.00"))
        if open_amount <= Decimal("0.00"):
            continue
        base_date = invoice.due_date or invoice.invoice_date
        days = (as_of_date - base_date).days
        if days <= 30:
            bucket = "0-30"
        elif days <= 60:
            bucket = "31-60"
        elif days <= 90:
            bucket = "61-90"
        elif days <= 120:
            bucket = "91-120"
        else:
            bucket = "120+"
        buckets[bucket] += open_amount
        rows.append(
            {
                "invoice_id": invoice.id,
                "invoice_number": invoice.invoice_number,
                "customer": invoice.customer.name,
                "days": days,
                "bucket": bucket,
                "open_amount": open_amount,
            }
        )
    return {"rows": rows, "buckets": buckets}


def build_ap_aging(*, as_of_date: date | None = None):
    as_of_date = as_of_date or timezone.localdate()
    buckets = {"0-30": Decimal("0.00"), "31-60": Decimal("0.00"), "61-90": Decimal("0.00"), "91-120": Decimal("0.00"), "120+": Decimal("0.00")}
    rows = []
    for invoice in PurchaseInvoice.objects.select_related("vendor").filter(status__in=[PurchaseInvoice.Status.POSTED, PurchaseInvoice.Status.PARTIALLY_PAID]):
        open_amount = (invoice.total_amount or Decimal("0.00")) - (invoice.paid_amount or Decimal("0.00"))
        if open_amount <= Decimal("0.00"):
            continue
        base_date = invoice.due_date or invoice.invoice_date
        days = (as_of_date - base_date).days
        if days <= 30:
            bucket = "0-30"
        elif days <= 60:
            bucket = "31-60"
        elif days <= 90:
            bucket = "61-90"
        elif days <= 120:
            bucket = "91-120"
        else:
            bucket = "120+"
        buckets[bucket] += open_amount
        rows.append(
            {
                "invoice_id": invoice.id,
                "invoice_number": invoice.invoice_number,
                "vendor": invoice.vendor.name,
                "days": days,
                "bucket": bucket,
                "open_amount": open_amount,
            }
        )
    return {"rows": rows, "buckets": buckets}


def build_profitability(*, dimension: str, start_date: date | None = None, end_date: date | None = None):
    lines = _posted_lines_queryset(start_date=start_date, end_date=end_date)
    normalized_dimension = dimension.replace("_", "-")

    if normalized_dimension == "customers":
        key = "customer__name"
    elif normalized_dimension == "items":
        key = "item__name"
    elif normalized_dimension == "cost-centers":
        key = "cost_center__name"
    else:
        raise ValidationError({"dimension": "Unsupported profitability dimension."})

    grouped = lines.values(key, "account__account_type").annotate(debit=Sum("debit"), credit=Sum("credit"))
    summary: dict[str, Decimal] = {}

    for row in grouped:
        name = row[key] or "Unassigned"
        current = summary.get(name, Decimal("0.00"))
        account_type = row["account__account_type"]
        debit = row["debit"] or Decimal("0.00")
        credit = row["credit"] or Decimal("0.00")
        if account_type == GLAccount.AccountType.REVENUE:
            current += credit - debit
        elif account_type == GLAccount.AccountType.EXPENSE:
            current -= debit - credit
        summary[name] = current

    rows = [{"name": name, "profitability": value} for name, value in sorted(summary.items(), key=lambda item: item[0])]
    return {"rows": rows}


def build_kpis():
    sales_posted_total = (
        SalesInvoice.objects.filter(status__in=[SalesInvoice.Status.POSTED, SalesInvoice.Status.PARTIALLY_PAID, SalesInvoice.Status.PAID]).aggregate(
            total=Sum("total_amount")
        )["total"]
        or Decimal("0.00")
    )
    purchase_posted_total = (
        PurchaseInvoice.objects.filter(status__in=[PurchaseInvoice.Status.POSTED, PurchaseInvoice.Status.PARTIALLY_PAID, PurchaseInvoice.Status.PAID]).aggregate(
            total=Sum("total_amount")
        )["total"]
        or Decimal("0.00")
    )
    return {
        "masters": {
            "customers": MasterCustomer.objects.count(),
            "vendors": MasterVendor.objects.count(),
            "items": MasterItem.objects.count(),
        },
        "sales": {
            "quotations": SalesQuotation.objects.count(),
            "orders": SalesOrder.objects.count(),
            "invoices": SalesInvoice.objects.count(),
            "posted_total": sales_posted_total,
        },
        "procurement": {
            "purchase_invoices": PurchaseInvoice.objects.count(),
            "posted_total": purchase_posted_total,
        },
        "treasury": {
            "receipts_total": TreasuryReceipt.objects.aggregate(total=Sum("amount"))["total"] or Decimal("0.00"),
            "payments_total": TreasuryPayment.objects.aggregate(total=Sum("amount"))["total"] or Decimal("0.00"),
        },
    }
