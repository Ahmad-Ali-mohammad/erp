from django.contrib import admin

from .models import PaymentAllocation, PaymentIntent, PaymentWebhookLog


@admin.register(PaymentIntent)
class PaymentIntentAdmin(admin.ModelAdmin):
    list_display = ("provider", "provider_intent_id", "status", "amount", "currency", "created_at")
    search_fields = ("provider_intent_id",)
    list_filter = ("provider", "status", "currency")


@admin.register(PaymentWebhookLog)
class PaymentWebhookLogAdmin(admin.ModelAdmin):
    list_display = ("provider", "event_type", "event_id", "processed", "created_at")
    search_fields = ("event_id", "event_type")
    list_filter = ("provider", "processed")


@admin.register(PaymentAllocation)
class PaymentAllocationAdmin(admin.ModelAdmin):
    list_display = ("payment", "invoice", "installment", "amount", "created_at")
