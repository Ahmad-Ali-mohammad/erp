from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP

from django.conf import settings
from rest_framework.exceptions import ValidationError


def _ensure_stripe_configured():
    api_key = getattr(settings, "STRIPE_API_KEY", "")
    if not api_key:
        raise ValidationError({"stripe": "STRIPE_API_KEY is not configured."})
    try:
        import stripe
    except ImportError as exc:  # pragma: no cover
        raise ValidationError({"stripe": "stripe library is not installed."}) from exc
    stripe.api_key = api_key
    return stripe


def _to_cents(amount: Decimal) -> int:
    return int((amount * Decimal("100")).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def create_payment_intent(*, amount: Decimal, currency: str, metadata: dict):
    stripe = _ensure_stripe_configured()
    return stripe.PaymentIntent.create(
        amount=_to_cents(amount),
        currency=currency.lower(),
        metadata=metadata or {},
        automatic_payment_methods={"enabled": True},
    )


def construct_webhook_event(payload: bytes, signature: str):
    webhook_secret = getattr(settings, "STRIPE_WEBHOOK_SECRET", "")
    if not webhook_secret:
        raise ValidationError({"stripe": "STRIPE_WEBHOOK_SECRET is not configured."})
    try:
        import stripe
    except ImportError as exc:  # pragma: no cover
        raise ValidationError({"stripe": "stripe library is not installed."}) from exc
    return stripe.Webhook.construct_event(payload, signature, webhook_secret)
