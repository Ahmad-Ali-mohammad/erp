from decimal import Decimal

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from core.models import TimeStampedModel


class GLAccount(TimeStampedModel):
    class AccountType(models.TextChoices):
        ASSET = "asset", "Asset"
        LIABILITY = "liability", "Liability"
        EQUITY = "equity", "Equity"
        REVENUE = "revenue", "Revenue"
        EXPENSE = "expense", "Expense"

    code = models.CharField(max_length=40, unique=True)
    name = models.CharField(max_length=255)
    account_type = models.CharField(max_length=20, choices=AccountType.choices)
    parent = models.ForeignKey("self", on_delete=models.SET_NULL, null=True, blank=True, related_name="children")
    level = models.PositiveSmallIntegerField(default=1)
    is_postable = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["code"]

    def __str__(self):
        return f"{self.code} - {self.name}"


class CostCenter(TimeStampedModel):
    code = models.CharField(max_length=40, unique=True)
    name = models.CharField(max_length=255)
    parent = models.ForeignKey("self", on_delete=models.SET_NULL, null=True, blank=True, related_name="children")
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["code"]

    def __str__(self):
        return f"{self.code} - {self.name}"


class MasterCustomer(TimeStampedModel):
    code = models.CharField(max_length=40, unique=True)
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=40, blank=True)
    email = models.EmailField(blank=True)
    address = models.CharField(max_length=255, blank=True)
    credit_limit = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class MasterVendor(TimeStampedModel):
    code = models.CharField(max_length=40, unique=True)
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=40, blank=True)
    email = models.EmailField(blank=True)
    address = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class MasterItem(TimeStampedModel):
    sku = models.CharField(max_length=60, unique=True)
    name = models.CharField(max_length=255)
    uom = models.CharField(max_length=20, default="unit")
    standard_cost = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    sales_price = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    min_reorder_qty = models.DecimalField(max_digits=14, decimal_places=3, default=Decimal("0.000"))
    track_inventory = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["sku"]

    def __str__(self):
        return f"{self.sku} - {self.name}"


class InventoryLocation(TimeStampedModel):
    code = models.CharField(max_length=40, unique=True)
    name = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["code"]


class InventoryMovement(TimeStampedModel):
    class MovementType(models.TextChoices):
        IN = "in", "In"
        OUT = "out", "Out"
        ADJUSTMENT = "adjustment", "Adjustment"

    item = models.ForeignKey(MasterItem, on_delete=models.PROTECT, related_name="movements")
    location = models.ForeignKey(InventoryLocation, on_delete=models.PROTECT, related_name="movements")
    movement_type = models.CharField(max_length=20, choices=MovementType.choices)
    quantity = models.DecimalField(max_digits=14, decimal_places=3)
    unit_cost = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    movement_date = models.DateField()
    reference_type = models.CharField(max_length=60, blank=True)
    reference_id = models.CharField(max_length=60, blank=True)

    class Meta:
        ordering = ["-movement_date", "-id"]


class SalesQuotation(TimeStampedModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        APPROVED = "approved", "Approved"
        CONVERTED = "converted", "Converted"

    quotation_number = models.CharField(max_length=40, unique=True)
    customer = models.ForeignKey(MasterCustomer, on_delete=models.PROTECT, related_name="quotations")
    quotation_date = models.DateField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)


class SalesQuotationLine(TimeStampedModel):
    quotation = models.ForeignKey(SalesQuotation, on_delete=models.CASCADE, related_name="lines")
    item = models.ForeignKey(MasterItem, on_delete=models.PROTECT)
    quantity = models.DecimalField(max_digits=14, decimal_places=3)
    unit_price = models.DecimalField(max_digits=14, decimal_places=2)


class SalesOrder(TimeStampedModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        CONFIRMED = "confirmed", "Confirmed"
        INVOICED = "invoiced", "Invoiced"

    order_number = models.CharField(max_length=40, unique=True)
    customer = models.ForeignKey(MasterCustomer, on_delete=models.PROTECT, related_name="orders")
    order_date = models.DateField()
    quotation = models.ForeignKey(SalesQuotation, on_delete=models.SET_NULL, null=True, blank=True, related_name="orders")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)


class SalesOrderLine(TimeStampedModel):
    order = models.ForeignKey(SalesOrder, on_delete=models.CASCADE, related_name="lines")
    item = models.ForeignKey(MasterItem, on_delete=models.PROTECT)
    quantity = models.DecimalField(max_digits=14, decimal_places=3)
    unit_price = models.DecimalField(max_digits=14, decimal_places=2)


class SalesInvoice(TimeStampedModel):
    class InvoiceType(models.TextChoices):
        CREDIT = "credit", "Credit"
        CASH = "cash", "Cash"

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        POSTED = "posted", "Posted"
        PARTIALLY_PAID = "partially_paid", "Partially Paid"
        PAID = "paid", "Paid"

    invoice_number = models.CharField(max_length=40, unique=True)
    invoice_type = models.CharField(max_length=20, choices=InvoiceType.choices, default=InvoiceType.CREDIT)
    customer = models.ForeignKey(MasterCustomer, on_delete=models.PROTECT, related_name="sales_invoices")
    order = models.ForeignKey(SalesOrder, on_delete=models.SET_NULL, null=True, blank=True, related_name="invoices")
    cost_center = models.ForeignKey(CostCenter, on_delete=models.SET_NULL, null=True, blank=True, related_name="sales_invoices")
    invoice_date = models.DateField()
    due_date = models.DateField(null=True, blank=True)
    subtotal = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    tax_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    paid_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="erp_v2_created_sales_invoices",
    )
    posted_at = models.DateTimeField(null=True, blank=True)
    posted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="erp_v2_posted_sales_invoices",
    )


class SalesInvoiceLine(TimeStampedModel):
    invoice = models.ForeignKey(SalesInvoice, on_delete=models.CASCADE, related_name="lines")
    item = models.ForeignKey(MasterItem, on_delete=models.PROTECT)
    quantity = models.DecimalField(max_digits=14, decimal_places=3)
    unit_price = models.DecimalField(max_digits=14, decimal_places=2)


class PurchaseOrder(TimeStampedModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        SENT = "sent", "Sent"
        RECEIVED = "received", "Received"

    order_number = models.CharField(max_length=40, unique=True)
    vendor = models.ForeignKey(MasterVendor, on_delete=models.PROTECT, related_name="purchase_orders")
    order_date = models.DateField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)


class PurchaseOrderLine(TimeStampedModel):
    order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name="lines")
    item = models.ForeignKey(MasterItem, on_delete=models.PROTECT)
    quantity = models.DecimalField(max_digits=14, decimal_places=3)
    received_quantity = models.DecimalField(max_digits=14, decimal_places=3, default=Decimal("0.000"))
    unit_cost = models.DecimalField(max_digits=14, decimal_places=2)


class PurchaseReceipt(TimeStampedModel):
    receipt_number = models.CharField(max_length=40, unique=True)
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.PROTECT, related_name="receipts")
    location = models.ForeignKey(InventoryLocation, on_delete=models.PROTECT, related_name="receipts")
    receipt_date = models.DateField()


class PurchaseReceiptLine(TimeStampedModel):
    receipt = models.ForeignKey(PurchaseReceipt, on_delete=models.CASCADE, related_name="lines")
    item = models.ForeignKey(MasterItem, on_delete=models.PROTECT)
    quantity = models.DecimalField(max_digits=14, decimal_places=3)
    unit_cost = models.DecimalField(max_digits=14, decimal_places=2)


class PurchaseInvoice(TimeStampedModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        POSTED = "posted", "Posted"
        PARTIALLY_PAID = "partially_paid", "Partially Paid"
        PAID = "paid", "Paid"

    invoice_number = models.CharField(max_length=40, unique=True)
    vendor = models.ForeignKey(MasterVendor, on_delete=models.PROTECT, related_name="purchase_invoices")
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.SET_NULL, null=True, blank=True, related_name="purchase_invoices")
    invoice_date = models.DateField()
    due_date = models.DateField(null=True, blank=True)
    subtotal = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    tax_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    paid_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="erp_v2_created_purchase_invoices",
    )
    posted_at = models.DateTimeField(null=True, blank=True)
    posted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="erp_v2_posted_purchase_invoices",
    )


class PurchaseInvoiceLine(TimeStampedModel):
    invoice = models.ForeignKey(PurchaseInvoice, on_delete=models.CASCADE, related_name="lines")
    item = models.ForeignKey(MasterItem, on_delete=models.PROTECT)
    quantity = models.DecimalField(max_digits=14, decimal_places=3)
    unit_cost = models.DecimalField(max_digits=14, decimal_places=2)


class TreasuryReceipt(TimeStampedModel):
    class Channel(models.TextChoices):
        CASH = "cash", "Cash"
        BANK = "bank", "Bank"

    receipt_number = models.CharField(max_length=40, unique=True)
    receipt_date = models.DateField()
    customer = models.ForeignKey(MasterCustomer, on_delete=models.PROTECT, related_name="treasury_receipts")
    sales_invoice = models.ForeignKey(SalesInvoice, on_delete=models.PROTECT, related_name="receipts")
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    channel = models.CharField(max_length=20, choices=Channel.choices, default=Channel.CASH)
    notes = models.TextField(blank=True)


class TreasuryPayment(TimeStampedModel):
    class Channel(models.TextChoices):
        CASH = "cash", "Cash"
        BANK = "bank", "Bank"

    payment_number = models.CharField(max_length=40, unique=True)
    payment_date = models.DateField()
    vendor = models.ForeignKey(MasterVendor, on_delete=models.PROTECT, related_name="treasury_payments")
    purchase_invoice = models.ForeignKey(PurchaseInvoice, on_delete=models.PROTECT, related_name="payments")
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    channel = models.CharField(max_length=20, choices=Channel.choices, default=Channel.CASH)
    notes = models.TextField(blank=True)


class TreasuryCheque(TimeStampedModel):
    class Direction(models.TextChoices):
        INCOMING = "incoming", "Incoming"
        OUTGOING = "outgoing", "Outgoing"

    class Status(models.TextChoices):
        RECEIVED = "received", "Received"
        DEPOSITED = "deposited", "Deposited"
        RETURNED = "returned", "Returned"
        CLEARED = "cleared", "Cleared"

    cheque_number = models.CharField(max_length=80)
    direction = models.CharField(max_length=20, choices=Direction.choices)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.RECEIVED)
    cheque_date = models.DateField()
    amount = models.DecimalField(max_digits=14, decimal_places=2)


class GLEntry(TimeStampedModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        POSTED = "posted", "Posted"

    entry_number = models.CharField(max_length=40, unique=True)
    entry_date = models.DateField()
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    source_type = models.CharField(max_length=60, blank=True)
    source_id = models.CharField(max_length=60, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="erp_v2_gl_entries")
    posted_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="erp_v2_posted_gl_entries")
    posted_at = models.DateTimeField(null=True, blank=True)


class GLEntryLine(TimeStampedModel):
    entry = models.ForeignKey(GLEntry, on_delete=models.CASCADE, related_name="lines")
    account = models.ForeignKey(GLAccount, on_delete=models.PROTECT, related_name="gl_lines")
    cost_center = models.ForeignKey(CostCenter, on_delete=models.SET_NULL, null=True, blank=True, related_name="gl_lines")
    customer = models.ForeignKey(MasterCustomer, on_delete=models.SET_NULL, null=True, blank=True, related_name="gl_lines")
    vendor = models.ForeignKey(MasterVendor, on_delete=models.SET_NULL, null=True, blank=True, related_name="gl_lines")
    item = models.ForeignKey(MasterItem, on_delete=models.SET_NULL, null=True, blank=True, related_name="gl_lines")
    debit = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"), validators=[MinValueValidator(Decimal("0.00"))])
    credit = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"), validators=[MinValueValidator(Decimal("0.00"))])

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=(models.Q(debit__gt=0, credit=0) | models.Q(credit__gt=0, debit=0)),
                name="erp_v2_gl_line_one_side",
            )
        ]


class PostingRule(TimeStampedModel):
    name = models.CharField(max_length=120, unique=True)
    source_type = models.CharField(max_length=60)
    strict = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)


class PostingRuleLine(TimeStampedModel):
    class Side(models.TextChoices):
        DEBIT = "debit", "Debit"
        CREDIT = "credit", "Credit"

    rule = models.ForeignKey(PostingRule, on_delete=models.CASCADE, related_name="lines")
    account = models.ForeignKey(GLAccount, on_delete=models.PROTECT)
    side = models.CharField(max_length=20, choices=Side.choices)
    amount_field = models.CharField(max_length=80)


class BankStatement(TimeStampedModel):
    statement_number = models.CharField(max_length=40, unique=True)
    statement_date = models.DateField()
    opening_balance = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    closing_balance = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))


class BankStatementLine(TimeStampedModel):
    statement = models.ForeignKey(BankStatement, on_delete=models.CASCADE, related_name="lines")
    txn_date = models.DateField()
    description = models.CharField(max_length=255, blank=True)
    reference = models.CharField(max_length=80, blank=True)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    matched = models.BooleanField(default=False)
    matched_entry = models.ForeignKey(GLEntry, on_delete=models.SET_NULL, null=True, blank=True, related_name="matched_bank_lines")
    matched_source_type = models.CharField(max_length=60, blank=True)


class BankReconciliationSession(TimeStampedModel):
    statement = models.ForeignKey(BankStatement, on_delete=models.PROTECT, related_name="reconciliation_sessions")
    run_at = models.DateTimeField(auto_now_add=True)
    matched_count = models.PositiveIntegerField(default=0)
    unmatched_count = models.PositiveIntegerField(default=0)
    notes = models.TextField(blank=True)


class InventoryCountSession(TimeStampedModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        COMPLETED = "completed", "Completed"

    session_number = models.CharField(max_length=40, unique=True)
    location = models.ForeignKey(InventoryLocation, on_delete=models.PROTECT, related_name="count_sessions")
    count_date = models.DateField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    notes = models.TextField(blank=True)


class InventoryAdjustment(TimeStampedModel):
    class Direction(models.TextChoices):
        INCREASE = "increase", "Increase"
        DECREASE = "decrease", "Decrease"

    adjustment_number = models.CharField(max_length=40, unique=True)
    location = models.ForeignKey(InventoryLocation, on_delete=models.PROTECT, related_name="adjustments")
    item = models.ForeignKey(MasterItem, on_delete=models.PROTECT, related_name="adjustments")
    adjustment_date = models.DateField()
    quantity = models.DecimalField(max_digits=14, decimal_places=3)
    unit_cost = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    direction = models.CharField(max_length=20, choices=Direction.choices)
    reason = models.CharField(max_length=255, blank=True)
