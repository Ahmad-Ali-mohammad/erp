from decimal import Decimal

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Q

from core.models import Customer, TimeStampedModel
from projects.models import CostCode, Project, ProjectPhase


class Account(TimeStampedModel):
    class AccountType(models.TextChoices):
        ASSET = "asset", "Asset"
        LIABILITY = "liability", "Liability"
        EQUITY = "equity", "Equity"
        REVENUE = "revenue", "Revenue"
        EXPENSE = "expense", "Expense"

    class ReportGrouping(models.TextChoices):
        CURRENT_ASSET = "current_asset", "Current Asset"
        NON_CURRENT_ASSET = "non_current_asset", "Non Current Asset"
        CURRENT_LIABILITY = "current_liability", "Current Liability"
        NON_CURRENT_LIABILITY = "non_current_liability", "Non Current Liability"
        EQUITY = "equity", "Equity"
        OPERATING_REVENUE = "operating_revenue", "Operating Revenue"
        OTHER_REVENUE = "other_revenue", "Other Revenue"
        OPERATING_EXPENSE = "operating_expense", "Operating Expense"
        OTHER_EXPENSE = "other_expense", "Other Expense"

    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=255)
    account_type = models.CharField(max_length=20, choices=AccountType.choices)
    report_group = models.CharField(max_length=40, choices=ReportGrouping.choices, blank=True, default="")
    parent = models.ForeignKey(
        "self", on_delete=models.SET_NULL, null=True, blank=True, related_name="children"
    )
    is_active = models.BooleanField(default=True)
    is_control_account = models.BooleanField(default=False)

    class Meta:
        ordering = ["code"]

    def __str__(self) -> str:
        return f"{self.code} - {self.name}"


class FiscalPeriod(TimeStampedModel):
    class Status(models.TextChoices):
        OPEN = "open", "Open"
        SOFT_CLOSED = "soft_closed", "Soft Closed"
        HARD_CLOSED = "hard_closed", "Hard Closed"

    year = models.PositiveSmallIntegerField()
    month = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(12)])
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    soft_closed_at = models.DateTimeField(null=True, blank=True)
    soft_closed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="soft_closed_fiscal_periods",
    )
    hard_closed_at = models.DateTimeField(null=True, blank=True)
    hard_closed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="hard_closed_fiscal_periods",
    )

    class Meta:
        ordering = ["-year", "-month"]
        constraints = [
            models.UniqueConstraint(fields=["year", "month"], name="finance_fiscal_period_unique_year_month")
        ]
        indexes = [
            models.Index(fields=["year", "month"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self) -> str:
        return f"{self.year}-{self.month:02d}"


class ExchangeRate(TimeStampedModel):
    from_currency = models.CharField(max_length=3, default="USD")
    to_currency = models.CharField(max_length=3, default="KWD")
    rate_date = models.DateField()
    rate = models.DecimalField(
        max_digits=18,
        decimal_places=8,
        validators=[MinValueValidator(Decimal("0.00000001"))],
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="exchange_rates",
    )
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-rate_date", "from_currency", "to_currency"]
        constraints = [
            models.UniqueConstraint(
                fields=["from_currency", "to_currency", "rate_date"],
                name="finance_exchange_rate_unique_pair_date",
            )
        ]
        indexes = [models.Index(fields=["from_currency", "to_currency", "rate_date"])]

    def __str__(self) -> str:
        return f"{self.from_currency}/{self.to_currency} @ {self.rate} ({self.rate_date})"


class PrintSettings(TimeStampedModel):
    class WatermarkType(models.TextChoices):
        NONE = "none", "None"
        TEXT = "text", "Text"
        IMAGE = "image", "Image"

    watermark_type = models.CharField(max_length=10, choices=WatermarkType.choices, default=WatermarkType.TEXT)
    watermark_text = models.CharField(max_length=255, blank=True)
    watermark_image_url = models.URLField(blank=True)
    watermark_opacity = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        default=Decimal("0.12"),
        validators=[MinValueValidator(Decimal("0.00")), MaxValueValidator(Decimal("1.00"))],
    )
    watermark_rotation = models.IntegerField(default=-30)
    watermark_scale = models.DecimalField(max_digits=4, decimal_places=2, default=Decimal("1.00"))
    invoice_prefix = models.CharField(max_length=20, default="INV-")
    invoice_padding = models.PositiveIntegerField(default=5)
    invoice_next_number = models.PositiveIntegerField(default=1)

    class Meta:
        verbose_name = "Print Settings"
        verbose_name_plural = "Print Settings"

    def __str__(self) -> str:
        return "Print Settings"


class JournalEntry(TimeStampedModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        POSTED = "posted", "Posted"
        REVERSED = "reversed", "Reversed"

    class EntryClass(models.TextChoices):
        DAILY_RECURRING = "daily_recurring", "Daily Recurring"
        ADJUSTING = "adjusting", "Adjusting"
        CLOSING = "closing", "Closing"
        BANK_RECONCILIATION = "bank_reconciliation", "Bank Reconciliation"
        CORRECTION = "correction", "Correction"
        OPENING_BALANCE = "opening_balance", "Opening Balance"
        MANUAL = "manual", "Manual"
        OPERATIONAL_AUTO = "operational_auto", "Operational Auto"

    entry_number = models.CharField(max_length=30, unique=True)
    entry_date = models.DateField()
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    entry_class = models.CharField(max_length=30, choices=EntryClass.choices, default=EntryClass.MANUAL)
    source_module = models.CharField(max_length=100, blank=True)
    source_object_id = models.CharField(max_length=64, blank=True)
    source_event = models.CharField(max_length=100, blank=True)
    idempotency_key = models.CharField(max_length=180, blank=True, null=True, unique=True)
    currency = models.CharField(max_length=3, default="KWD")
    fx_rate_to_base = models.DecimalField(
        max_digits=18,
        decimal_places=8,
        default=Decimal("1.00000000"),
        validators=[MinValueValidator(Decimal("0.00000001"))],
    )
    period = models.ForeignKey(
        FiscalPeriod,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="journal_entries",
    )
    posted_at = models.DateTimeField(null=True, blank=True)
    posted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="posted_journal_entries",
    )
    reversal_of = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reversals",
    )
    correction_root = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="corrections",
    )
    project = models.ForeignKey(
        Project,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="journal_entries",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="journal_entries",
    )

    class Meta:
        ordering = ["-entry_date", "-created_at"]
        indexes = [
            models.Index(fields=["entry_number", "entry_date"]),
            models.Index(fields=["status", "entry_date"]),
            models.Index(fields=["entry_class", "entry_date"]),
            models.Index(fields=["source_module", "source_event"]),
        ]

    def __str__(self) -> str:
        return self.entry_number


class JournalLine(TimeStampedModel):
    entry = models.ForeignKey(JournalEntry, on_delete=models.CASCADE, related_name="lines")
    account = models.ForeignKey(Account, on_delete=models.PROTECT, related_name="journal_lines")
    description = models.CharField(max_length=255, blank=True)
    debit = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    credit = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    debit_foreign = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    credit_foreign = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    project = models.ForeignKey(
        Project,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="journal_lines",
    )
    cost_center_code = models.CharField(max_length=30, blank=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=(Q(debit__gt=0, credit=0) | Q(credit__gt=0, debit=0)),
                name="finance_journal_line_one_side_non_zero",
            )
        ]

    def __str__(self) -> str:
        return f"{self.entry.entry_number} - {self.account.code}"


class PostingRule(TimeStampedModel):
    class PostingPolicy(models.TextChoices):
        IMMEDIATE = "immediate", "Immediate"
        MANUAL = "manual", "Manual"

    name = models.CharField(max_length=120)
    source_module = models.CharField(max_length=120)
    source_event = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    posting_policy = models.CharField(max_length=20, choices=PostingPolicy.choices, default=PostingPolicy.IMMEDIATE)
    entry_class = models.CharField(
        max_length=30,
        choices=JournalEntry.EntryClass.choices,
        default=JournalEntry.EntryClass.OPERATIONAL_AUTO,
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="posting_rules",
    )

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["source_module", "source_event"],
                name="finance_posting_rule_unique_source_event",
            )
        ]
        indexes = [models.Index(fields=["source_module", "source_event", "is_active"])]

    def __str__(self) -> str:
        return self.name


class PostingRuleLine(TimeStampedModel):
    class Side(models.TextChoices):
        DEBIT = "debit", "Debit"
        CREDIT = "credit", "Credit"

    posting_rule = models.ForeignKey(PostingRule, on_delete=models.CASCADE, related_name="lines")
    line_order = models.PositiveIntegerField(default=1)
    account = models.ForeignKey(Account, on_delete=models.PROTECT, related_name="posting_rule_lines")
    side = models.CharField(max_length=10, choices=Side.choices)
    amount_source = models.CharField(max_length=180, blank=True)
    fixed_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    description_template = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["posting_rule", "line_order", "id"]
        constraints = [
            models.CheckConstraint(
                condition=(Q(amount_source__gt="") | Q(fixed_amount__isnull=False)),
                name="finance_posting_rule_line_has_amount_source_or_fixed_amount",
            )
        ]

    def __str__(self) -> str:
        return f"{self.posting_rule.name} - {self.account.code} ({self.side})"


class RecurringEntryTemplate(TimeStampedModel):
    class Frequency(models.TextChoices):
        DAILY = "daily", "Daily"
        WEEKLY = "weekly", "Weekly"
        MONTHLY = "monthly", "Monthly"
        QUARTERLY = "quarterly", "Quarterly"

    template_code = models.CharField(max_length=40, unique=True)
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    frequency = models.CharField(max_length=20, choices=Frequency.choices)
    start_date = models.DateField()
    next_run_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    currency = models.CharField(max_length=3, default="KWD")
    auto_post = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    project = models.ForeignKey(
        Project,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="recurring_entry_templates",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="recurring_entry_templates",
    )

    class Meta:
        ordering = ["template_code"]
        indexes = [models.Index(fields=["is_active", "next_run_date"])]

    def __str__(self) -> str:
        return f"{self.template_code} - {self.name}"


class RecurringEntryTemplateLine(TimeStampedModel):
    class Side(models.TextChoices):
        DEBIT = "debit", "Debit"
        CREDIT = "credit", "Credit"

    template = models.ForeignKey(RecurringEntryTemplate, on_delete=models.CASCADE, related_name="lines")
    line_order = models.PositiveIntegerField(default=1)
    account = models.ForeignKey(Account, on_delete=models.PROTECT, related_name="recurring_template_lines")
    side = models.CharField(max_length=10, choices=Side.choices)
    amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    description = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["template", "line_order", "id"]

    def __str__(self) -> str:
        return f"{self.template.template_code} - {self.account.code}"


class BankAccount(TimeStampedModel):
    code = models.CharField(max_length=30, unique=True)
    name = models.CharField(max_length=120)
    bank_name = models.CharField(max_length=120)
    account_number = models.CharField(max_length=80, blank=True)
    currency = models.CharField(max_length=3, default="KWD")
    gl_account = models.ForeignKey(
        Account,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="bank_accounts",
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["code"]

    def __str__(self) -> str:
        return f"{self.code} - {self.name}"


class BankStatement(TimeStampedModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        IMPORTED = "imported", "Imported"
        RECONCILED = "reconciled", "Reconciled"

    bank_account = models.ForeignKey(BankAccount, on_delete=models.CASCADE, related_name="statements")
    statement_date = models.DateField()
    opening_balance = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    closing_balance = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    notes = models.TextField(blank=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="bank_statements",
    )

    class Meta:
        ordering = ["-statement_date", "-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["bank_account", "statement_date"],
                name="finance_bank_statement_unique_per_day_account",
            )
        ]

    def __str__(self) -> str:
        return f"{self.bank_account.code} - {self.statement_date}"


class BankStatementLine(TimeStampedModel):
    statement = models.ForeignKey(BankStatement, on_delete=models.CASCADE, related_name="lines")
    line_date = models.DateField()
    description = models.CharField(max_length=255, blank=True)
    reference = models.CharField(max_length=120, blank=True)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    is_reconciled = models.BooleanField(default=False)
    matched_journal_line = models.ForeignKey(
        JournalLine,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="matched_bank_statement_lines",
    )

    class Meta:
        ordering = ["statement", "line_date", "id"]

    def __str__(self) -> str:
        return f"{self.statement_id} - {self.line_date} - {self.amount}"


class BankReconciliationSession(TimeStampedModel):
    class Status(models.TextChoices):
        OPEN = "open", "Open"
        CLOSED = "closed", "Closed"

    bank_account = models.ForeignKey(BankAccount, on_delete=models.CASCADE, related_name="reconciliation_sessions")
    period = models.ForeignKey(
        FiscalPeriod,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="bank_reconciliation_sessions",
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    started_at = models.DateTimeField(auto_now_add=True)
    started_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="started_bank_reconciliation_sessions",
    )
    closed_at = models.DateTimeField(null=True, blank=True)
    closed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="closed_bank_reconciliation_sessions",
    )
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-started_at"]

    def __str__(self) -> str:
        return f"{self.bank_account.code} - {self.started_at.date()}"


class JournalEntryRecurringDetail(TimeStampedModel):
    journal_entry = models.OneToOneField(
        JournalEntry,
        on_delete=models.CASCADE,
        related_name="recurring_detail",
    )
    template = models.ForeignKey(
        RecurringEntryTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="generated_entries",
    )
    scheduled_for = models.DateField(null=True, blank=True)
    run_reference = models.CharField(max_length=80, blank=True)

    def __str__(self) -> str:
        return f"Recurring detail for {self.journal_entry.entry_number}"


class JournalEntryAdjustingDetail(TimeStampedModel):
    class AdjustmentType(models.TextChoices):
        DEFERRED_REVENUE = "deferred_revenue", "Deferred Revenue"
        ACCRUED_EXPENSE = "accrued_expense", "Accrued Expense"
        DEPRECIATION = "depreciation", "Depreciation"
        OTHER = "other", "Other"

    journal_entry = models.OneToOneField(
        JournalEntry,
        on_delete=models.CASCADE,
        related_name="adjusting_detail",
    )
    adjustment_type = models.CharField(max_length=30, choices=AdjustmentType.choices, default=AdjustmentType.OTHER)
    reference = models.CharField(max_length=120, blank=True)

    def __str__(self) -> str:
        return f"Adjusting detail for {self.journal_entry.entry_number}"


class JournalEntryClosingDetail(TimeStampedModel):
    class ClosingScope(models.TextChoices):
        MONTHLY = "monthly", "Monthly"
        YEARLY = "yearly", "Yearly"

    journal_entry = models.OneToOneField(
        JournalEntry,
        on_delete=models.CASCADE,
        related_name="closing_detail",
    )
    fiscal_year = models.PositiveSmallIntegerField()
    scope = models.CharField(max_length=20, choices=ClosingScope.choices, default=ClosingScope.YEARLY)

    def __str__(self) -> str:
        return f"Closing detail for {self.journal_entry.entry_number}"


class JournalEntryBankReconDetail(TimeStampedModel):
    journal_entry = models.OneToOneField(
        JournalEntry,
        on_delete=models.CASCADE,
        related_name="bank_recon_detail",
    )
    reconciliation_session = models.ForeignKey(
        BankReconciliationSession,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reconciliation_entries",
    )
    bank_statement_line = models.ForeignKey(
        BankStatementLine,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reconciliation_entries",
    )

    def __str__(self) -> str:
        return f"Bank recon detail for {self.journal_entry.entry_number}"


class JournalEntryCorrectionDetail(TimeStampedModel):
    journal_entry = models.OneToOneField(
        JournalEntry,
        on_delete=models.CASCADE,
        related_name="correction_detail",
    )
    corrected_entry = models.ForeignKey(
        JournalEntry,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="correction_details",
    )
    reason = models.TextField(blank=True)

    def __str__(self) -> str:
        return f"Correction detail for {self.journal_entry.entry_number}"


class Invoice(TimeStampedModel):
    class InvoiceType(models.TextChoices):
        CUSTOMER = "customer", "Customer"
        SUPPLIER = "supplier", "Supplier"
        SUBCONTRACTOR = "subcontractor", "Subcontractor"

    class InvoiceStatus(models.TextChoices):
        DRAFT = "draft", "Draft"
        PENDING_APPROVAL = "pending_approval", "Pending Approval"
        ISSUED = "issued", "Issued"
        PARTIALLY_PAID = "partially_paid", "Partially Paid"
        PAID = "paid", "Paid"
        REJECTED = "rejected", "Rejected"
        CANCELLED = "cancelled", "Cancelled"

    invoice_number = models.CharField(max_length=40, unique=True)
    invoice_type = models.CharField(max_length=20, choices=InvoiceType.choices)
    status = models.CharField(max_length=20, choices=InvoiceStatus.choices, default=InvoiceStatus.DRAFT)
    project = models.ForeignKey(
        Project,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="invoices",
    )
    customer = models.ForeignKey(
        Customer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="invoices",
    )
    cost_code = models.ForeignKey(
        CostCode,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="invoices",
    )
    partner_name = models.CharField(max_length=255)
    issue_date = models.DateField()
    due_date = models.DateField(null=True, blank=True)
    currency = models.CharField(max_length=3, default="KWD")
    subtotal = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    tax_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="invoices",
    )
    submitted_at = models.DateTimeField(null=True, blank=True)
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="submitted_invoices",
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_invoices",
    )
    rejected_at = models.DateTimeField(null=True, blank=True)
    rejected_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="rejected_invoices",
    )
    rejection_reason = models.TextField(blank=True)

    class Meta:
        ordering = ["-issue_date", "-created_at"]

    def __str__(self) -> str:
        return self.invoice_number


class InvoiceItem(TimeStampedModel):
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name="items")
    cost_code = models.ForeignKey(
        CostCode,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="invoice_items",
    )
    project_phase = models.ForeignKey(
        ProjectPhase,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="invoice_items",
    )
    description = models.CharField(max_length=255)
    quantity = models.DecimalField(max_digits=14, decimal_places=3, default=Decimal("1.000"))
    unit_price = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("15.00"))

    class Meta:
        ordering = ["invoice", "id"]

    @property
    def line_subtotal(self) -> Decimal:
        return self.quantity * self.unit_price

    @property
    def line_tax(self) -> Decimal:
        return self.line_subtotal * (self.tax_rate / Decimal("100"))

    def __str__(self) -> str:
        return f"{self.invoice.invoice_number} - {self.description}"


class Payment(TimeStampedModel):
    class Method(models.TextChoices):
        CASH = "cash", "Cash"
        BANK_TRANSFER = "bank_transfer", "Bank Transfer"
        CARD = "card", "Card"
        CHEQUE = "cheque", "Cheque"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        CONFIRMED = "confirmed", "Confirmed"
        FAILED = "failed", "Failed"

    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name="payments")
    payment_date = models.DateField()
    amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    method = models.CharField(max_length=20, choices=Method.choices)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    reference_no = models.CharField(max_length=100, blank=True)
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payments",
    )
    submitted_at = models.DateTimeField(null=True, blank=True)
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="submitted_payments",
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_payments",
    )
    rejected_at = models.DateTimeField(null=True, blank=True)
    rejected_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="rejected_payments",
    )
    rejection_reason = models.TextField(blank=True)

    class Meta:
        ordering = ["-payment_date", "-created_at"]

    def __str__(self) -> str:
        return f"{self.invoice.invoice_number} - {self.amount}"


class ProgressBilling(TimeStampedModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PENDING_APPROVAL = "pending_approval", "Pending Approval"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        INVOICED = "invoiced", "Invoiced"

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="progress_billings")
    billing_number = models.CharField(max_length=40)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    billing_date = models.DateField()
    period_start = models.DateField(null=True, blank=True)
    period_end = models.DateField(null=True, blank=True)
    completion_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00")), MaxValueValidator(Decimal("100.00"))],
    )
    contract_value_snapshot = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    subtotal = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    tax_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("15.00"),
        validators=[MinValueValidator(Decimal("0.00")), MaxValueValidator(Decimal("100.00"))],
    )
    tax_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    linked_invoice = models.ForeignKey(
        "Invoice",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="progress_billings",
    )
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="progress_billings",
    )
    submitted_at = models.DateTimeField(null=True, blank=True)
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="submitted_progress_billings",
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_progress_billings",
    )
    rejected_at = models.DateTimeField(null=True, blank=True)
    rejected_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="rejected_progress_billings",
    )
    rejection_reason = models.TextField(blank=True)

    class Meta:
        ordering = ["-billing_date", "-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["project", "billing_number"],
                name="finance_progress_billing_unique_number_per_project",
            )
        ]
        indexes = [
            models.Index(fields=["project", "status"]),
            models.Index(fields=["billing_date"]),
        ]

    def __str__(self) -> str:
        return f"{self.project.code} - {self.billing_number}"


class RevenueRecognitionEntry(TimeStampedModel):
    class RecognitionMethod(models.TextChoices):
        PERCENTAGE_OF_COMPLETION = "percentage_of_completion", "Percentage Of Completion"
        COMPLETED_CONTRACT = "completed_contract", "Completed Contract"

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PENDING_APPROVAL = "pending_approval", "Pending Approval"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="revenue_recognition_entries")
    entry_number = models.CharField(max_length=40)
    method = models.CharField(max_length=30, choices=RecognitionMethod.choices)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    recognition_date = models.DateField()
    progress_billing = models.ForeignKey(
        ProgressBilling,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="revenue_entries",
    )
    recognized_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00")), MaxValueValidator(Decimal("100.00"))],
    )
    recognized_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="revenue_recognition_entries",
    )
    submitted_at = models.DateTimeField(null=True, blank=True)
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="submitted_revenue_entries",
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_revenue_entries",
    )
    rejected_at = models.DateTimeField(null=True, blank=True)
    rejected_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="rejected_revenue_entries",
    )
    rejection_reason = models.TextField(blank=True)

    class Meta:
        ordering = ["-recognition_date", "-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["project", "entry_number"],
                name="finance_revenue_recognition_unique_number_per_project",
            )
        ]
        indexes = [
            models.Index(fields=["project", "status"]),
            models.Index(fields=["recognition_date"]),
            models.Index(fields=["method"]),
        ]

    def __str__(self) -> str:
        return f"{self.project.code} - {self.entry_number}"
