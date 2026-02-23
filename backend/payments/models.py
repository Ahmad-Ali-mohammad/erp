from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models

from core.models import Customer, TimeStampedModel


class PaymentIntent(TimeStampedModel):
    class Provider(models.TextChoices):
        STRIPE = "stripe", "Stripe"

    class Status(models.TextChoices):
        CREATED = "created", "Created"
        REQUIRES_ACTION = "requires_action", "Requires Action"
        SUCCEEDED = "succeeded", "Succeeded"
        FAILED = "failed", "Failed"
        CANCELLED = "cancelled", "Cancelled"

    provider = models.CharField(max_length=20, choices=Provider.choices, default=Provider.STRIPE)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.CREATED)
    amount = models.DecimalField(max_digits=14, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))])
    currency = models.CharField(max_length=3, default="KWD")
    invoice = models.ForeignKey(
        "finance.Invoice",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payment_intents",
    )
    installment = models.ForeignKey(
        "real_estate.Installment",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payment_intents",
    )
    customer = models.ForeignKey(
        Customer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payment_intents",
    )
    provider_intent_id = models.CharField(max_length=120, blank=True)
    client_secret = models.CharField(max_length=255, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payment_intents",
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.provider}:{self.provider_intent_id or self.id}"


class PaymentWebhookLog(TimeStampedModel):
    provider = models.CharField(max_length=20, default=PaymentIntent.Provider.STRIPE)
    event_id = models.CharField(max_length=120)
    event_type = models.CharField(max_length=120)
    payload = models.JSONField(default=dict, blank=True)
    signature = models.CharField(max_length=255, blank=True)
    processed = models.BooleanField(default=False)
    processed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["provider", "event_id"], name="payments_webhook_unique_provider_event")
        ]

    def __str__(self) -> str:
        return f"{self.provider}:{self.event_type}:{self.event_id}"


class PaymentAllocation(TimeStampedModel):
    payment = models.ForeignKey(
        "finance.Payment",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="allocations",
    )
    invoice = models.ForeignKey(
        "finance.Invoice",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payment_allocations",
    )
    installment = models.ForeignKey(
        "real_estate.Installment",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payment_allocations",
    )
    amount = models.DecimalField(max_digits=14, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))])

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.amount}"
