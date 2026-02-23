from rest_framework import serializers

from .models import PaymentAllocation, PaymentIntent, PaymentWebhookLog


class PaymentIntentSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentIntent
        fields = [
            "id",
            "provider",
            "status",
            "amount",
            "currency",
            "invoice",
            "installment",
            "customer",
            "provider_intent_id",
            "client_secret",
            "metadata",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "status",
            "provider_intent_id",
            "client_secret",
            "created_by",
            "created_at",
            "updated_at",
        ]
        extra_kwargs = {
            "amount": {"required": False},
            "currency": {"required": False},
        }


class PaymentWebhookLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentWebhookLog
        fields = [
            "id",
            "provider",
            "event_id",
            "event_type",
            "payload",
            "signature",
            "processed",
            "processed_at",
            "created_at",
        ]
        read_only_fields = ["created_at"]


class PaymentAllocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentAllocation
        fields = [
            "id",
            "payment",
            "invoice",
            "installment",
            "amount",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class PaymentAllocationDetailSerializer(serializers.ModelSerializer):
    payment_reference = serializers.CharField(source="payment.reference_no", read_only=True, allow_null=True)
    payment_date = serializers.DateField(source="payment.payment_date", read_only=True, allow_null=True)
    payment_method = serializers.CharField(source="payment.method", read_only=True, allow_null=True)
    payment_status = serializers.CharField(source="payment.status", read_only=True, allow_null=True)
    payment_amount = serializers.DecimalField(
        source="payment.amount",
        max_digits=14,
        decimal_places=2,
        read_only=True,
        allow_null=True,
    )
    currency = serializers.CharField(source="invoice.currency", read_only=True, allow_null=True)

    class Meta:
        model = PaymentAllocation
        fields = [
            "id",
            "payment",
            "invoice",
            "installment",
            "amount",
            "payment_reference",
            "payment_date",
            "payment_method",
            "payment_status",
            "payment_amount",
            "currency",
            "created_at",
        ]
        read_only_fields = ["created_at"]
