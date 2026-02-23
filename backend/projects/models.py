from decimal import Decimal

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone

from core.models import TimeStampedModel


class Project(TimeStampedModel):
    class Status(models.TextChoices):
        PLANNING = "planning", "Planning"
        ACTIVE = "active", "Active"
        ON_HOLD = "on_hold", "On Hold"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    code = models.CharField(max_length=30, unique=True)
    name = models.CharField(max_length=255)
    client_name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PLANNING)
    contract_value = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    budget = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    currency = models.CharField(max_length=3, default="KWD")
    start_date = models.DateField(null=True, blank=True)
    expected_end_date = models.DateField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_projects",
    )
    closed_at = models.DateTimeField(null=True, blank=True)
    closed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="closed_projects",
    )

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["code"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self) -> str:
        return f"{self.code} - {self.name}"


class ProjectPhase(TimeStampedModel):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="phases")
    name = models.CharField(max_length=255)
    sequence = models.PositiveIntegerField(default=1)
    budget = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    planned_progress = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    actual_progress = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ["project", "sequence"]
        constraints = [
            models.UniqueConstraint(
                fields=["project", "sequence"], name="projects_phase_unique_sequence_per_project"
            )
        ]

    def __str__(self) -> str:
        return f"{self.project.code} - {self.name}"


class BoQItem(TimeStampedModel):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="boq_items")
    phase = models.ForeignKey(
        ProjectPhase,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="boq_items",
    )
    item_code = models.CharField(max_length=40)
    description = models.TextField()
    unit = models.CharField(max_length=20, default="unit")
    planned_quantity = models.DecimalField(max_digits=14, decimal_places=3, default=Decimal("0.000"))
    planned_unit_cost = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    actual_quantity = models.DecimalField(max_digits=14, decimal_places=3, default=Decimal("0.000"))
    actual_unit_cost = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    vendor_name = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["project", "item_code"]
        constraints = [
            models.UniqueConstraint(fields=["project", "item_code"], name="projects_boq_unique_code_per_project")
        ]

    @property
    def planned_total_cost(self) -> Decimal:
        return self.planned_quantity * self.planned_unit_cost

    @property
    def actual_total_cost(self) -> Decimal:
        return self.actual_quantity * self.actual_unit_cost

    def __str__(self) -> str:
        return f"{self.project.code} - {self.item_code}"


class CostCode(TimeStampedModel):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="cost_codes")
    code = models.CharField(max_length=40)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    parent = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="children",
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["project", "code"]
        constraints = [
            models.UniqueConstraint(fields=["project", "code"], name="projects_cost_code_unique_per_project")
        ]
        indexes = [
            models.Index(fields=["project", "is_active"]),
        ]

    def __str__(self) -> str:
        return f"{self.project.code} - {self.code}"


class ProjectBudgetLine(TimeStampedModel):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="budget_lines")
    cost_code = models.ForeignKey(CostCode, on_delete=models.PROTECT, related_name="budget_lines")
    baseline_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    revised_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["project", "cost_code__code"]
        constraints = [
            models.UniqueConstraint(
                fields=["project", "cost_code"],
                name="projects_budget_line_unique_cost_code_per_project",
            )
        ]
        indexes = [
            models.Index(fields=["project", "cost_code"]),
        ]

    def __str__(self) -> str:
        return f"{self.project.code} - {self.cost_code.code}"


class ProjectCostRecord(TimeStampedModel):
    class RecordType(models.TextChoices):
        COMMITMENT = "commitment", "Commitment"
        ACTUAL = "actual", "Actual"

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="cost_records")
    cost_code = models.ForeignKey(CostCode, on_delete=models.PROTECT, related_name="cost_records")
    record_type = models.CharField(max_length=20, choices=RecordType.choices)
    amount = models.DecimalField(max_digits=14, decimal_places=2, validators=[MinValueValidator(Decimal("0.00"))])
    record_date = models.DateField(default=timezone.localdate)
    source_module = models.CharField(max_length=60, blank=True)
    source_reference = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="project_cost_records",
    )

    class Meta:
        ordering = ["-record_date", "-created_at"]
        indexes = [
            models.Index(fields=["project", "cost_code", "record_type"]),
            models.Index(fields=["record_date"]),
        ]

    def __str__(self) -> str:
        return f"{self.project.code} - {self.cost_code.code} - {self.record_type}"


class ChangeOrder(TimeStampedModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PENDING_APPROVAL = "pending_approval", "Pending Approval"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="change_orders")
    order_number = models.CharField(max_length=40)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_change_orders",
    )
    submitted_at = models.DateTimeField(null=True, blank=True)
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="submitted_change_orders",
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_change_orders",
    )
    rejected_at = models.DateTimeField(null=True, blank=True)
    rejected_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="rejected_change_orders",
    )
    rejection_reason = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["project", "order_number"],
                name="projects_change_order_unique_number_per_project",
            )
        ]
        indexes = [
            models.Index(fields=["project", "status"]),
        ]

    def total_contract_value_delta(self) -> Decimal:
        return self.lines.aggregate(total=models.Sum("contract_value_delta"))["total"] or Decimal("0.00")

    def total_budget_delta(self) -> Decimal:
        return self.lines.aggregate(total=models.Sum("budget_delta"))["total"] or Decimal("0.00")

    def __str__(self) -> str:
        return f"{self.project.code} - {self.order_number}"


class ChangeOrderLine(TimeStampedModel):
    change_order = models.ForeignKey(ChangeOrder, on_delete=models.CASCADE, related_name="lines")
    cost_code = models.ForeignKey(
        CostCode,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="change_order_lines",
    )
    description = models.CharField(max_length=255)
    contract_value_delta = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    budget_delta = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))

    class Meta:
        ordering = ["change_order", "id"]

    def __str__(self) -> str:
        return f"{self.change_order.order_number} - {self.description}"


class Subcontractor(TimeStampedModel):
    code = models.CharField(max_length=40, unique=True)
    name = models.CharField(max_length=255)
    tax_number = models.CharField(max_length=80, blank=True)
    phone = models.CharField(max_length=40, blank=True)
    email = models.EmailField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return f"{self.code} - {self.name}"


class Subcontract(TimeStampedModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        ACTIVE = "active", "Active"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="subcontracts")
    subcontractor = models.ForeignKey(Subcontractor, on_delete=models.PROTECT, related_name="subcontracts")
    contract_number = models.CharField(max_length=40, unique=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    contract_value = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    retention_percent = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00")), MaxValueValidator(Decimal("100.00"))],
    )
    retention_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.contract_number


class SubcontractPayment(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PAID = "paid", "Paid"
        CANCELLED = "cancelled", "Cancelled"

    subcontract = models.ForeignKey(Subcontract, on_delete=models.CASCADE, related_name="payments")
    payment_date = models.DateField()
    amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-payment_date", "-created_at"]

    def __str__(self) -> str:
        return f"{self.subcontract.contract_number} - {self.amount}"
