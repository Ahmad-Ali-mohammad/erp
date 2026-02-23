from decimal import Decimal

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from core.models import Customer, TimeStampedModel


class RealEstateProject(TimeStampedModel):
    class Status(models.TextChoices):
        PLANNING = "planning", "Planning"
        ACTIVE = "active", "Active"
        ON_HOLD = "on_hold", "On Hold"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    code = models.CharField(max_length=40, unique=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    location = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PLANNING)
    currency = models.CharField(max_length=3, default="KWD")
    start_date = models.DateField(null=True, blank=True)
    expected_end_date = models.DateField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="real_estate_projects",
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.code} - {self.name}"


class Building(TimeStampedModel):
    project = models.ForeignKey(RealEstateProject, on_delete=models.CASCADE, related_name="buildings")
    code = models.CharField(max_length=40)
    name = models.CharField(max_length=255)
    floors = models.PositiveIntegerField(default=1)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["project", "code"]
        constraints = [
            models.UniqueConstraint(fields=["project", "code"], name="real_estate_building_unique_code_per_project")
        ]

    def __str__(self) -> str:
        return f"{self.project.code} - {self.code}"


class UnitType(TimeStampedModel):
    project = models.ForeignKey(RealEstateProject, on_delete=models.CASCADE, related_name="unit_types")
    code = models.CharField(max_length=40)
    name = models.CharField(max_length=255)
    bedrooms = models.PositiveIntegerField(default=0)
    bathrooms = models.PositiveIntegerField(default=0)
    area_sqm = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    base_price = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))

    class Meta:
        ordering = ["project", "code"]
        constraints = [
            models.UniqueConstraint(fields=["project", "code"], name="real_estate_unit_type_unique_code_per_project")
        ]

    def __str__(self) -> str:
        return f"{self.project.code} - {self.code}"


class Unit(TimeStampedModel):
    class Status(models.TextChoices):
        AVAILABLE = "available", "Available"
        RESERVED = "reserved", "Reserved"
        SOLD = "sold", "Sold"
        HANDED_OVER = "handed_over", "Handed Over"

    building = models.ForeignKey(Building, on_delete=models.CASCADE, related_name="units")
    unit_type = models.ForeignKey(UnitType, on_delete=models.SET_NULL, null=True, blank=True, related_name="units")
    code = models.CharField(max_length=40)
    floor = models.IntegerField(default=0)
    area_sqm = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.AVAILABLE)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["building", "code"]
        constraints = [
            models.UniqueConstraint(fields=["building", "code"], name="real_estate_unit_unique_code_per_building")
        ]

    def __str__(self) -> str:
        return f"{self.building.code} - {self.code}"


class UnitPricing(TimeStampedModel):
    unit = models.ForeignKey(Unit, on_delete=models.CASCADE, related_name="prices")
    price = models.DecimalField(max_digits=14, decimal_places=2)
    currency = models.CharField(max_length=3, default="KWD")
    effective_date = models.DateField()
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["-effective_date"]

    def __str__(self) -> str:
        return f"{self.unit.code} @ {self.price}"


class Reservation(TimeStampedModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        RESERVED = "reserved", "Reserved"
        CANCELLED = "cancelled", "Cancelled"
        EXPIRED = "expired", "Expired"
        CONVERTED = "converted", "Converted"

    reservation_number = models.CharField(max_length=40, unique=True)
    unit = models.ForeignKey(Unit, on_delete=models.CASCADE, related_name="reservations")
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name="reservations")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    reserved_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="unit_reservations",
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.reservation_number


class SalesContract(TimeStampedModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        ACTIVE = "active", "Active"
        CANCELLED = "cancelled", "Cancelled"
        COMPLETED = "completed", "Completed"

    contract_number = models.CharField(max_length=40, unique=True)
    unit = models.ForeignKey(Unit, on_delete=models.PROTECT, related_name="sales_contracts")
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name="sales_contracts")
    reservation = models.ForeignKey(
        Reservation,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sales_contracts",
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    contract_date = models.DateField()
    total_price = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    down_payment = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    currency = models.CharField(max_length=3, default="KWD")
    signed_by = models.CharField(max_length=255, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sales_contracts",
    )

    class Meta:
        ordering = ["-contract_date", "-created_at"]

    def __str__(self) -> str:
        return self.contract_number


class PaymentSchedule(TimeStampedModel):
    contract = models.ForeignKey(SalesContract, on_delete=models.CASCADE, related_name="payment_schedules")
    name = models.CharField(max_length=120, default="Main")
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["contract", "created_at"]

    def __str__(self) -> str:
        return f"{self.contract.contract_number} - {self.name}"


class Installment(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PAID = "paid", "Paid"
        OVERDUE = "overdue", "Overdue"
        CANCELLED = "cancelled", "Cancelled"

    schedule = models.ForeignKey(PaymentSchedule, on_delete=models.CASCADE, related_name="installments")
    installment_number = models.CharField(max_length=40)
    due_date = models.DateField()
    amount = models.DecimalField(max_digits=14, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))])
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    paid_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    paid_at = models.DateTimeField(null=True, blank=True)
    linked_invoice = models.ForeignKey(
        "finance.Invoice",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="real_estate_installments",
    )

    class Meta:
        ordering = ["due_date", "installment_number"]
        constraints = [
            models.UniqueConstraint(
                fields=["schedule", "installment_number"],
                name="real_estate_installment_unique_number_per_schedule",
            )
        ]

    def __str__(self) -> str:
        return f"{self.schedule.contract.contract_number} - {self.installment_number}"


class Handover(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        HANDED_OVER = "handed_over", "Handed Over"
        CANCELLED = "cancelled", "Cancelled"

    contract = models.ForeignKey(SalesContract, on_delete=models.CASCADE, related_name="handovers")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    handover_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-handover_date", "-created_at"]

    def __str__(self) -> str:
        return f"{self.contract.contract_number} - {self.status}"
