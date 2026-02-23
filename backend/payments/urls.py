from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import PaymentAllocationViewSet, PaymentIntentViewSet, StripeWebhookView

router = DefaultRouter()
router.register("payment-intents", PaymentIntentViewSet, basename="payment-intent")
router.register("payment-allocations", PaymentAllocationViewSet, basename="payment-allocation")

urlpatterns = [
    path("stripe/webhook/", StripeWebhookView.as_view(), name="stripe-webhook"),
    path("", include(router.urls)),
]
