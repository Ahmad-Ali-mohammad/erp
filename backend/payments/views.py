from decimal import Decimal

from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError

from core.access import RowLevelScopeMixin
from core.audit import AuditLogMixin
from core.services.company_profile import get_company_profile
from finance.models import Invoice, InvoiceItem, Payment
from finance.services.printing import next_invoice_number
from payments.models import PaymentAllocation, PaymentIntent, PaymentWebhookLog
from payments.serializers import PaymentAllocationSerializer, PaymentIntentSerializer
from payments.services.stripe_service import construct_webhook_event, create_payment_intent
from real_estate.models import Installment


def _calculate_invoice_totals(invoice: Invoice):
    subtotal = Decimal("0.00")
    tax_amount = Decimal("0.00")
    for item in invoice.items.all():
        line_subtotal = item.quantity * item.unit_price
        line_tax = line_subtotal * (item.tax_rate / Decimal("100"))
        subtotal += line_subtotal
        tax_amount += line_tax
    invoice.subtotal = subtotal
    invoice.tax_amount = tax_amount
    invoice.total_amount = subtotal + tax_amount
    invoice.save(update_fields=["subtotal", "tax_amount", "total_amount", "updated_at"])


def _ensure_installment_invoice(installment: Installment) -> Invoice:
    if installment.linked_invoice:
        return installment.linked_invoice

    contract = installment.schedule.contract
    customer = contract.customer
    profile = get_company_profile()
    tax_rate = profile.default_tax_rate or Decimal("0.00")
    invoice = Invoice.objects.create(
        invoice_number=next_invoice_number(),
        invoice_type=Invoice.InvoiceType.CUSTOMER,
        status=Invoice.InvoiceStatus.ISSUED,
        project=None,
        cost_code=None,
        customer=customer,
        partner_name=customer.name,
        issue_date=timezone.localdate(),
        due_date=installment.due_date,
        currency=contract.currency or profile.base_currency,
        created_by=None,
    )
    InvoiceItem.objects.create(
        invoice=invoice,
        description=f"Real estate installment {installment.installment_number}",
        quantity=Decimal("1.000"),
        unit_price=installment.amount,
        tax_rate=tax_rate,
    )
    _calculate_invoice_totals(invoice)

    installment.linked_invoice = invoice
    installment.save(update_fields=["linked_invoice", "updated_at"])
    return invoice


def _update_invoice_status(invoice: Invoice):
    paid_total = (
        invoice.payments.filter(status=Payment.Status.CONFIRMED).aggregate(total=Sum("amount"))["total"]
        or Decimal("0.00")
    )
    if paid_total >= invoice.total_amount:
        new_status = Invoice.InvoiceStatus.PAID
    elif paid_total > Decimal("0.00"):
        new_status = Invoice.InvoiceStatus.PARTIALLY_PAID
    else:
        new_status = invoice.status
    if new_status != invoice.status:
        invoice.status = new_status
        invoice.save(update_fields=["status", "updated_at"])


class PaymentIntentViewSet(AuditLogMixin, RowLevelScopeMixin, viewsets.ModelViewSet):
    queryset = PaymentIntent.objects.select_related("invoice", "installment", "customer", "created_by").all()
    serializer_class = PaymentIntentSerializer
    permission_classes = [IsAuthenticated]
    user_scope_fields = (
        "created_by",
        "customer__user",
        "invoice__created_by",
        "invoice__customer__user",
        "installment__schedule__contract__customer__user",
    )
    filterset_fields = ["status", "provider", "invoice", "installment", "customer"]
    search_fields = ["provider_intent_id"]
    ordering_fields = ["created_at", "amount"]

    def get_queryset(self):
        return self.apply_row_level_scope(super().get_queryset())

    def perform_create(self, serializer):
        invoice = serializer.validated_data.get("invoice")
        installment = serializer.validated_data.get("installment")
        customer = serializer.validated_data.get("customer")

        if installment and not invoice:
            invoice = _ensure_installment_invoice(installment)

        if not invoice and not installment:
            raise ValidationError({"payment_intent": "Either invoice or installment must be provided."})

        user = self.request.user
        if getattr(user, "is_customer", False):
            if invoice and invoice.customer and invoice.customer.user_id != user.id:
                raise ValidationError({"invoice": "You are not allowed to pay this invoice."})
            if installment and installment.schedule.contract.customer.user_id != user.id:
                raise ValidationError({"installment": "You are not allowed to pay this installment."})

        if not customer:
            if invoice and invoice.customer:
                customer = invoice.customer
            elif installment:
                customer = installment.schedule.contract.customer

        amount = serializer.validated_data.get("amount")
        if not amount:
            if invoice:
                amount = invoice.total_amount
            else:
                amount = installment.amount

        currency = serializer.validated_data.get("currency") or (invoice.currency if invoice else "KWD")

        metadata = serializer.validated_data.get("metadata", {})
        if invoice:
            metadata.setdefault("invoice_id", str(invoice.id))
        if installment:
            metadata.setdefault("installment_id", str(installment.id))

        stripe_intent = create_payment_intent(amount=amount, currency=currency, metadata=metadata)

        instance = serializer.save(
            amount=amount,
            currency=currency,
            invoice=invoice,
            customer=customer,
            provider=PaymentIntent.Provider.STRIPE,
            provider_intent_id=stripe_intent.id,
            client_secret=stripe_intent.client_secret or "",
            created_by=self.request.user,
        )
        self.log_action(action="create", instance=instance, changes=serializer.validated_data)


class PaymentAllocationViewSet(AuditLogMixin, RowLevelScopeMixin, viewsets.ModelViewSet):
    queryset = PaymentAllocation.objects.select_related("payment", "invoice", "installment").all()
    serializer_class = PaymentAllocationSerializer
    permission_classes = [IsAuthenticated]
    user_scope_fields = (
        "payment__recorded_by",
        "invoice__created_by",
        "invoice__customer__user",
        "installment__schedule__contract__customer__user",
    )
    filterset_fields = ["payment", "invoice", "installment"]
    ordering_fields = ["created_at", "amount"]

    def get_queryset(self):
        return self.apply_row_level_scope(super().get_queryset())


class StripeWebhookView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        payload = request.body
        signature = request.META.get("HTTP_STRIPE_SIGNATURE", "")

        event = construct_webhook_event(payload, signature)
        log = PaymentWebhookLog.objects.create(
            provider=PaymentIntent.Provider.STRIPE,
            event_id=event.id,
            event_type=event.type,
            payload=event.to_dict(),
            signature=signature,
        )

        if event.type == "payment_intent.succeeded":
            self._handle_payment_intent_success(event.data["object"])
        elif event.type == "payment_intent.payment_failed":
            self._handle_payment_intent_failed(event.data["object"])

        log.processed = True
        log.processed_at = timezone.now()
        log.save(update_fields=["processed", "processed_at", "updated_at"])
        return Response(status=status.HTTP_200_OK)

    def _handle_payment_intent_success(self, intent_payload):
        intent_id = intent_payload.get("id")
        amount_received = Decimal(str(intent_payload.get("amount_received", 0))) / Decimal("100")
        with transaction.atomic():
            intent = PaymentIntent.objects.select_for_update().filter(provider_intent_id=intent_id).first()
            if not intent:
                return
            intent.status = PaymentIntent.Status.SUCCEEDED
            intent.save(update_fields=["status", "updated_at"])

            invoice = intent.invoice
            installment = intent.installment

            if invoice:
                payment, created = Payment.objects.get_or_create(
                    invoice=invoice,
                    reference_no=intent_id,
                    defaults={
                        "payment_date": timezone.localdate(),
                        "amount": amount_received or intent.amount,
                        "method": Payment.Method.CARD,
                        "status": Payment.Status.CONFIRMED,
                    },
                )
                if created:
                    PaymentAllocation.objects.create(
                        payment=payment,
                        invoice=invoice,
                        installment=installment,
                        amount=payment.amount,
                    )
                _update_invoice_status(invoice)

            if installment:
                installment.paid_amount = installment.amount
                installment.paid_at = timezone.now()
                installment.status = Installment.Status.PAID
                installment.save(update_fields=["paid_amount", "paid_at", "status", "updated_at"])

    def _handle_payment_intent_failed(self, intent_payload):
        intent_id = intent_payload.get("id")
        intent = PaymentIntent.objects.filter(provider_intent_id=intent_id).first()
        if not intent:
            return
        intent.status = PaymentIntent.Status.FAILED
        intent.save(update_fields=["status", "updated_at"])
