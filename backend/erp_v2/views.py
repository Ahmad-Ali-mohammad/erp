from datetime import date
from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, parser_classes
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError

from core.services.sequence import next_sequence
from core.access import (
    ActionBasedRolePermission,
    ROLE_ACCOUNTANT,
    ROLE_ADMIN,
    ROLE_CASHIER,
    ROLE_PROJECT_MANAGER,
    ROLE_SITE_SUPERVISOR,
    ROLE_STOREKEEPER,
)

from .models import (
    BankReconciliationSession,
    BankStatement,
    CostCenter,
    GLEntry,
    GLAccount,
    InventoryAdjustment,
    InventoryCountSession,
    InventoryLocation,
    InventoryMovement,
    MasterCustomer,
    MasterItem,
    MasterVendor,
    PurchaseInvoice,
    PurchaseOrder,
    PurchaseReceipt,
    PostingRule,
    SalesInvoice,
    SalesInvoiceLine,
    SalesOrder,
    SalesOrderLine,
    SalesQuotation,
    TreasuryCheque,
    TreasuryPayment,
    TreasuryReceipt,
)
from .serializers import (
    BankReconciliationSessionSerializer,
    BankStatementSerializer,
    CostCenterSerializer,
    GLEntrySerializer,
    GLAccountSerializer,
    InventoryAdjustmentSerializer,
    InventoryCountSessionSerializer,
    InventoryLocationSerializer,
    InventoryMovementSerializer,
    MasterCustomerSerializer,
    MasterItemSerializer,
    MasterVendorSerializer,
    PurchaseInvoiceSerializer,
    PurchaseOrderSerializer,
    PurchaseReceiptSerializer,
    PostingRuleSerializer,
    SalesInvoiceSerializer,
    SalesOrderSerializer,
    SalesQuotationSerializer,
    TreasuryChequeSerializer,
    TreasuryPaymentSerializer,
    TreasuryReceiptSerializer,
)
from .services import (
    apply_inventory_adjustment,
    auto_post_purchase_invoice,
    auto_post_sales_invoice,
    build_ap_aging,
    build_ar_aging,
    build_balance_sheet,
    build_income_statement,
    build_kpis,
    build_profitability,
    build_trial_balance,
    parse_bank_csv,
    post_gl_entry,
    receive_purchase_order,
    register_treasury_payment,
    register_treasury_receipt,
    run_bank_reconciliation,
)

READ_ROLES = {ROLE_ADMIN, ROLE_ACCOUNTANT, ROLE_PROJECT_MANAGER, ROLE_SITE_SUPERVISOR, ROLE_CASHIER, ROLE_STOREKEEPER}
MANAGE_ROLES = {ROLE_ADMIN, ROLE_ACCOUNTANT}
TREASURY_ROLES = {ROLE_ADMIN, ROLE_ACCOUNTANT, ROLE_CASHIER}
STOCK_ROLES = {ROLE_ADMIN, ROLE_ACCOUNTANT, ROLE_STOREKEEPER}


def _next_doc_number(sequence_key: str, prefix: str) -> str:
    return next_sequence(sequence_key, prefix=prefix, padding=7)


@api_view(["GET"])
def health_view(request):
    return Response({"status": "ok", "service": "erp_v2"})


class BaseModelViewSet(viewsets.ModelViewSet):
    permission_classes = [ActionBasedRolePermission]
    action_role_map = {
        "list": READ_ROLES,
        "retrieve": READ_ROLES,
        "create": MANAGE_ROLES,
        "update": MANAGE_ROLES,
        "partial_update": MANAGE_ROLES,
        "destroy": MANAGE_ROLES,
        "*": MANAGE_ROLES,
    }


class GLAccountViewSet(BaseModelViewSet):
    queryset = GLAccount.objects.all().order_by("code")
    serializer_class = GLAccountSerializer
    search_fields = ["code", "name"]
    ordering_fields = ["code", "name", "account_type"]


class CostCenterViewSet(BaseModelViewSet):
    queryset = CostCenter.objects.all().order_by("code")
    serializer_class = CostCenterSerializer
    search_fields = ["code", "name"]
    ordering_fields = ["code", "name"]


class MasterCustomerViewSet(BaseModelViewSet):
    queryset = MasterCustomer.objects.all().order_by("name")
    serializer_class = MasterCustomerSerializer
    search_fields = ["code", "name", "email", "phone"]
    ordering_fields = ["code", "name"]


class MasterVendorViewSet(BaseModelViewSet):
    queryset = MasterVendor.objects.all().order_by("name")
    serializer_class = MasterVendorSerializer
    search_fields = ["code", "name", "email", "phone"]
    ordering_fields = ["code", "name"]


class MasterItemViewSet(BaseModelViewSet):
    queryset = MasterItem.objects.all().order_by("sku")
    serializer_class = MasterItemSerializer
    search_fields = ["sku", "name"]
    ordering_fields = ["sku", "name", "track_inventory"]


class InventoryLocationViewSet(BaseModelViewSet):
    queryset = InventoryLocation.objects.all().order_by("code")
    serializer_class = InventoryLocationSerializer
    search_fields = ["code", "name"]
    ordering_fields = ["code", "name"]


class InventoryMovementViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = InventoryMovement.objects.select_related("item", "location").order_by("-movement_date", "-id")
    serializer_class = InventoryMovementSerializer
    permission_classes = [ActionBasedRolePermission]
    action_role_map = {"list": READ_ROLES, "retrieve": READ_ROLES}
    filterset_fields = ["item", "location", "movement_type", "movement_date"]
    search_fields = ["reference_type", "reference_id"]
    ordering_fields = ["movement_date", "quantity", "id"]


class InventoryCountSessionViewSet(BaseModelViewSet):
    queryset = InventoryCountSession.objects.select_related("location").order_by("-count_date", "-id")
    serializer_class = InventoryCountSessionSerializer
    filterset_fields = ["location", "status", "count_date"]
    search_fields = ["session_number"]
    ordering_fields = ["count_date", "session_number"]
    action_role_map = {
        "list": READ_ROLES,
        "retrieve": READ_ROLES,
        "create": STOCK_ROLES,
        "update": STOCK_ROLES,
        "partial_update": STOCK_ROLES,
        "destroy": MANAGE_ROLES,
        "*": STOCK_ROLES,
    }


class InventoryAdjustmentViewSet(BaseModelViewSet):
    queryset = InventoryAdjustment.objects.select_related("location", "item").order_by("-adjustment_date", "-id")
    serializer_class = InventoryAdjustmentSerializer
    filterset_fields = ["location", "item", "direction", "adjustment_date"]
    search_fields = ["adjustment_number", "reason"]
    ordering_fields = ["adjustment_date", "adjustment_number"]
    action_role_map = {
        "list": READ_ROLES,
        "retrieve": READ_ROLES,
        "create": STOCK_ROLES,
        "update": STOCK_ROLES,
        "partial_update": STOCK_ROLES,
        "destroy": MANAGE_ROLES,
        "*": STOCK_ROLES,
    }

    def perform_create(self, serializer):
        with transaction.atomic():
            adjustment = serializer.save()
            apply_inventory_adjustment(adjustment=adjustment, performed_by=self.request.user)


class SalesQuotationViewSet(BaseModelViewSet):
    queryset = SalesQuotation.objects.select_related("customer").prefetch_related("lines").order_by("-quotation_date", "-id")
    serializer_class = SalesQuotationSerializer
    filterset_fields = ["status", "customer"]
    search_fields = ["quotation_number", "customer__name"]
    ordering_fields = ["quotation_date", "quotation_number"]


class SalesOrderViewSet(BaseModelViewSet):
    queryset = SalesOrder.objects.select_related("customer", "quotation").prefetch_related("lines").order_by("-order_date", "-id")
    serializer_class = SalesOrderSerializer
    filterset_fields = ["status", "customer"]
    search_fields = ["order_number", "customer__name"]
    ordering_fields = ["order_date", "order_number"]

    @action(detail=True, methods=["post"], url_path="convert-to-invoice")
    def convert_to_invoice(self, request, pk=None):
        order = self.get_object()
        if not order.lines.exists():
            return Response({"detail": "Order has no lines."}, status=status.HTTP_400_BAD_REQUEST)

        invoice = SalesInvoice.objects.create(
            invoice_number=_next_doc_number("erp_v2_sales_invoice", "SIN-"),
            invoice_type=SalesInvoice.InvoiceType.CREDIT,
            customer=order.customer,
            order=order,
            invoice_date=timezone.localdate(),
            due_date=timezone.localdate(),
            status=SalesInvoice.Status.DRAFT,
            created_by=request.user,
        )
        for line in order.lines.all():
            SalesInvoiceLine.objects.create(
                invoice=invoice,
                item=line.item,
                quantity=line.quantity,
                unit_price=line.unit_price,
            )

        order.status = SalesOrder.Status.INVOICED
        order.save(update_fields=["status", "updated_at"])
        return Response(SalesInvoiceSerializer(invoice).data)


class SalesInvoiceViewSet(BaseModelViewSet):
    queryset = SalesInvoice.objects.select_related("customer", "order", "cost_center").prefetch_related("lines").order_by("-invoice_date", "-id")
    serializer_class = SalesInvoiceSerializer
    filterset_fields = ["status", "invoice_type", "customer", "invoice_date"]
    search_fields = ["invoice_number", "customer__name"]
    ordering_fields = ["invoice_date", "invoice_number", "total_amount"]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["post"], url_path="post")
    def post_invoice(self, request, pk=None):
        invoice = self.get_object()
        location_id = request.data.get("location")
        location = None
        if location_id:
            location = InventoryLocation.objects.filter(pk=location_id).first()
            if not location:
                return Response({"location": "Location not found."}, status=status.HTTP_400_BAD_REQUEST)
        auto_post_sales_invoice(invoice=invoice, location=location, posted_by=request.user)
        invoice.refresh_from_db()
        return Response(self.get_serializer(invoice).data)


class POSCheckoutView(APIView):
    permission_classes = [ActionBasedRolePermission]
    action_role_map = {"*": TREASURY_ROLES}

    def post(self, request):
        customer_id = request.data.get("customer")
        location_id = request.data.get("location")
        lines = request.data.get("lines") or []

        customer = MasterCustomer.objects.filter(pk=customer_id).first()
        if not customer:
            return Response({"customer": "Customer is required."}, status=status.HTTP_400_BAD_REQUEST)
        location = InventoryLocation.objects.filter(pk=location_id).first()
        if not location:
            return Response({"location": "Location is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not isinstance(lines, list) or not lines:
            return Response({"lines": "At least one line is required."}, status=status.HTTP_400_BAD_REQUEST)

        invoice = SalesInvoice.objects.create(
            invoice_number=_next_doc_number("erp_v2_sales_pos_invoice", "POS-"),
            invoice_type=SalesInvoice.InvoiceType.CASH,
            customer=customer,
            invoice_date=timezone.localdate(),
            due_date=timezone.localdate(),
            status=SalesInvoice.Status.DRAFT,
            created_by=request.user,
        )

        for raw_line in lines:
            item = MasterItem.objects.filter(pk=raw_line.get("item")).first()
            if not item:
                return Response({"item": "Invalid item in lines."}, status=status.HTTP_400_BAD_REQUEST)
            qty = Decimal(str(raw_line.get("quantity", "0")))
            unit_price = Decimal(str(raw_line.get("unit_price", item.sales_price)))
            SalesInvoiceLine.objects.create(invoice=invoice, item=item, quantity=qty, unit_price=unit_price)

        auto_post_sales_invoice(
            invoice=invoice,
            location=location,
            posted_by=request.user,
            enforce_maker_checker=False,
        )
        return Response(SalesInvoiceSerializer(invoice).data, status=status.HTTP_201_CREATED)


class PurchaseOrderViewSet(BaseModelViewSet):
    queryset = PurchaseOrder.objects.select_related("vendor").prefetch_related("lines").order_by("-order_date", "-id")
    serializer_class = PurchaseOrderSerializer
    filterset_fields = ["status", "vendor", "order_date"]
    search_fields = ["order_number", "vendor__name"]
    ordering_fields = ["order_date", "order_number"]
    action_role_map = BaseModelViewSet.action_role_map | {"receive": STOCK_ROLES}

    @action(detail=True, methods=["post"], url_path="send")
    def send_order(self, request, pk=None):
        order = self.get_object()
        if order.status != PurchaseOrder.Status.DRAFT:
            return Response({"status": "Only draft orders can be sent."}, status=status.HTTP_400_BAD_REQUEST)
        order.status = PurchaseOrder.Status.SENT
        order.save(update_fields=["status", "updated_at"])
        return Response(self.get_serializer(order).data)

    @action(detail=True, methods=["post"], url_path="receive")
    def receive(self, request, pk=None):
        order = self.get_object()
        location_id = request.data.get("location")
        location = InventoryLocation.objects.filter(pk=location_id).first()
        if not location:
            return Response({"location": "Location is required."}, status=status.HTTP_400_BAD_REQUEST)
        receipt_date = request.data.get("receipt_date")
        if receipt_date:
            try:
                parsed_receipt_date = date.fromisoformat(str(receipt_date))
            except ValueError:
                return Response({"receipt_date": "Invalid date format. Use YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)
        else:
            parsed_receipt_date = timezone.localdate()

        lines_payload = request.data.get("lines") or []
        receipt = receive_purchase_order(
            purchase_order=order,
            lines_payload=lines_payload,
            location=location,
            receipt_date=parsed_receipt_date,
            performed_by=request.user,
        )
        return Response(PurchaseReceiptSerializer(receipt).data)


class PurchaseReceiptViewSet(BaseModelViewSet):
    queryset = PurchaseReceipt.objects.select_related("purchase_order", "location").prefetch_related("lines").order_by("-receipt_date", "-id")
    serializer_class = PurchaseReceiptSerializer
    filterset_fields = ["purchase_order", "location", "receipt_date"]
    search_fields = ["receipt_number", "purchase_order__order_number"]
    ordering_fields = ["receipt_date", "receipt_number"]


class PurchaseInvoiceViewSet(BaseModelViewSet):
    queryset = PurchaseInvoice.objects.select_related("vendor", "purchase_order").prefetch_related("lines").order_by("-invoice_date", "-id")
    serializer_class = PurchaseInvoiceSerializer
    filterset_fields = ["status", "vendor", "invoice_date"]
    search_fields = ["invoice_number", "vendor__name"]
    ordering_fields = ["invoice_date", "invoice_number", "total_amount"]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["post"], url_path="post")
    def post_invoice(self, request, pk=None):
        invoice = self.get_object()
        auto_post_purchase_invoice(invoice=invoice, posted_by=request.user)
        invoice.refresh_from_db()
        return Response(self.get_serializer(invoice).data)


class TreasuryReceiptViewSet(BaseModelViewSet):
    queryset = TreasuryReceipt.objects.select_related("customer", "sales_invoice").order_by("-receipt_date", "-id")
    serializer_class = TreasuryReceiptSerializer
    filterset_fields = ["customer", "receipt_date"]
    search_fields = ["receipt_number", "customer__name"]
    ordering_fields = ["receipt_date", "amount"]
    action_role_map = {
        "list": READ_ROLES,
        "retrieve": READ_ROLES,
        "create": TREASURY_ROLES,
        "update": TREASURY_ROLES,
        "partial_update": TREASURY_ROLES,
        "destroy": MANAGE_ROLES,
        "*": TREASURY_ROLES,
    }

    def perform_create(self, serializer):
        payload = serializer.validated_data
        payload.setdefault("receipt_number", _next_doc_number("erp_v2_treasury_receipt", "RCV-"))
        obj = register_treasury_receipt(payload=payload, performed_by=self.request.user)
        serializer.instance = obj


class TreasuryPaymentViewSet(BaseModelViewSet):
    queryset = TreasuryPayment.objects.select_related("vendor", "purchase_invoice").order_by("-payment_date", "-id")
    serializer_class = TreasuryPaymentSerializer
    filterset_fields = ["vendor", "payment_date"]
    search_fields = ["payment_number", "vendor__name"]
    ordering_fields = ["payment_date", "amount"]
    action_role_map = {
        "list": READ_ROLES,
        "retrieve": READ_ROLES,
        "create": TREASURY_ROLES,
        "update": TREASURY_ROLES,
        "partial_update": TREASURY_ROLES,
        "destroy": MANAGE_ROLES,
        "*": TREASURY_ROLES,
    }

    def perform_create(self, serializer):
        payload = serializer.validated_data
        payload.setdefault("payment_number", _next_doc_number("erp_v2_treasury_payment", "PAY-"))
        obj = register_treasury_payment(payload=payload, performed_by=self.request.user)
        serializer.instance = obj


class TreasuryChequeViewSet(BaseModelViewSet):
    queryset = TreasuryCheque.objects.all().order_by("-cheque_date", "-id")
    serializer_class = TreasuryChequeSerializer
    filterset_fields = ["direction", "status", "cheque_date"]
    search_fields = ["cheque_number"]
    ordering_fields = ["cheque_date", "amount"]
    action_role_map = {
        "list": READ_ROLES,
        "retrieve": READ_ROLES,
        "create": TREASURY_ROLES,
        "update": TREASURY_ROLES,
        "partial_update": TREASURY_ROLES,
        "destroy": MANAGE_ROLES,
        "*": TREASURY_ROLES,
    }

    @action(detail=True, methods=["post"], url_path="deposit")
    def deposit(self, request, pk=None):
        cheque = self.get_object()
        cheque.status = TreasuryCheque.Status.DEPOSITED
        cheque.save(update_fields=["status", "updated_at"])
        return Response(self.get_serializer(cheque).data)

    @action(detail=True, methods=["post"], url_path="return")
    def mark_returned(self, request, pk=None):
        cheque = self.get_object()
        cheque.status = TreasuryCheque.Status.RETURNED
        cheque.save(update_fields=["status", "updated_at"])
        return Response(self.get_serializer(cheque).data)

    @action(detail=True, methods=["post"], url_path="clear")
    def clear(self, request, pk=None):
        cheque = self.get_object()
        cheque.status = TreasuryCheque.Status.CLEARED
        cheque.save(update_fields=["status", "updated_at"])
        return Response(self.get_serializer(cheque).data)


class BankStatementViewSet(BaseModelViewSet):
    queryset = BankStatement.objects.prefetch_related("lines").order_by("-statement_date", "-id")
    serializer_class = BankStatementSerializer
    filterset_fields = ["statement_date"]
    search_fields = ["statement_number"]
    ordering_fields = ["statement_date", "statement_number"]

    @action(detail=False, methods=["post"], url_path="import-csv")
    @parser_classes([MultiPartParser])
    def import_csv(self, request):
        file_obj = request.data.get("file")
        statement_number = request.data.get("statement_number") or _next_doc_number("erp_v2_bank_statement", "BST-")
        statement_date_raw = request.data.get("statement_date")
        if statement_date_raw:
            try:
                statement_date = date.fromisoformat(str(statement_date_raw))
            except ValueError:
                return Response({"statement_date": "Invalid date format. Use YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)
        else:
            statement_date = timezone.localdate()

        if not file_obj:
            return Response({"file": "CSV file is required."}, status=status.HTTP_400_BAD_REQUEST)

        rows = parse_bank_csv(file_obj)
        statement = BankStatement.objects.create(statement_number=statement_number, statement_date=statement_date)
        for row in rows:
            statement.lines.create(**row)

        return Response(self.get_serializer(statement).data, status=status.HTTP_201_CREATED)


class BankReconciliationSessionViewSet(BaseModelViewSet):
    queryset = BankReconciliationSession.objects.select_related("statement").order_by("-run_at", "-id")
    serializer_class = BankReconciliationSessionSerializer
    filterset_fields = ["statement"]
    ordering_fields = ["run_at", "matched_count", "unmatched_count"]

    @action(detail=False, methods=["post"], url_path="run")
    def run(self, request):
        statement_id = request.data.get("statement")
        statement = BankStatement.objects.filter(pk=statement_id).first()
        if not statement:
            return Response({"statement": "Valid statement id is required."}, status=status.HTTP_400_BAD_REQUEST)

        session = run_bank_reconciliation(statement=statement)
        return Response(self.get_serializer(session).data)


class GLEntryViewSet(BaseModelViewSet):
    queryset = GLEntry.objects.prefetch_related("lines", "lines__account").order_by("-entry_date", "-id")
    serializer_class = GLEntrySerializer
    filterset_fields = ["status", "entry_date", "source_type"]
    ordering_fields = ["entry_date", "entry_number"]

    action_role_map = BaseModelViewSet.action_role_map | {"post_entry": MANAGE_ROLES}

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["post"], url_path="post")
    def post_entry(self, request, pk=None):
        entry = self.get_object()
        post_gl_entry(entry=entry, posted_by=request.user)
        entry.refresh_from_db()
        return Response(self.get_serializer(entry).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="reverse")
    def reverse(self, request, pk=None):
        return Response({"detail": "Reverse is planned for a later release."}, status=status.HTTP_501_NOT_IMPLEMENTED)

    @action(detail=True, methods=["post"], url_path="correct")
    def correct(self, request, pk=None):
        return Response({"detail": "Correct is planned for a later release."}, status=status.HTTP_501_NOT_IMPLEMENTED)


class PostingRuleViewSet(BaseModelViewSet):
    queryset = PostingRule.objects.prefetch_related("lines").order_by("source_type", "name")
    serializer_class = PostingRuleSerializer
    filterset_fields = ["source_type", "is_active", "strict"]
    search_fields = ["name", "source_type"]
    ordering_fields = ["source_type", "name"]


class ReportsViewSet(viewsets.ViewSet):
    permission_classes = [ActionBasedRolePermission]
    action_role_map = {"*": READ_ROLES}

    def _parse_date(self, value, field_name):
        if not value:
            return None
        try:
            return date.fromisoformat(str(value))
        except ValueError:
            raise ValidationError({field_name: "Invalid date format. Use YYYY-MM-DD."})

    @action(detail=False, methods=["get"], url_path="trial-balance")
    def trial_balance(self, request):
        start_date = self._parse_date(request.query_params.get("start_date"), "start_date")
        end_date = self._parse_date(request.query_params.get("end_date"), "end_date")
        return Response(build_trial_balance(start_date=start_date, end_date=end_date))

    @action(detail=False, methods=["get"], url_path="kpis")
    def kpis(self, request):
        return Response(build_kpis())

    @action(detail=False, methods=["get"], url_path="income-statement")
    def income_statement(self, request):
        start_date = self._parse_date(request.query_params.get("start_date"), "start_date")
        end_date = self._parse_date(request.query_params.get("end_date"), "end_date")
        return Response(build_income_statement(start_date=start_date, end_date=end_date))

    @action(detail=False, methods=["get"], url_path="balance-sheet")
    def balance_sheet(self, request):
        as_of_date = self._parse_date(request.query_params.get("as_of_date"), "as_of_date")
        return Response(build_balance_sheet(as_of_date=as_of_date))

    @action(detail=False, methods=["get"], url_path="ar-aging")
    def ar_aging(self, request):
        as_of_date = self._parse_date(request.query_params.get("as_of_date"), "as_of_date")
        return Response(build_ar_aging(as_of_date=as_of_date))

    @action(detail=False, methods=["get"], url_path="ap-aging")
    def ap_aging(self, request):
        as_of_date = self._parse_date(request.query_params.get("as_of_date"), "as_of_date")
        return Response(build_ap_aging(as_of_date=as_of_date))

    @action(detail=False, methods=["get"], url_path="profitability/customers")
    def profitability_customers(self, request):
        start_date = self._parse_date(request.query_params.get("start_date"), "start_date")
        end_date = self._parse_date(request.query_params.get("end_date"), "end_date")
        return Response(build_profitability(dimension="customers", start_date=start_date, end_date=end_date))

    @action(detail=False, methods=["get"], url_path="profitability/items")
    def profitability_items(self, request):
        start_date = self._parse_date(request.query_params.get("start_date"), "start_date")
        end_date = self._parse_date(request.query_params.get("end_date"), "end_date")
        return Response(build_profitability(dimension="items", start_date=start_date, end_date=end_date))

    @action(detail=False, methods=["get"], url_path="profitability/cost-centers")
    def profitability_cost_centers(self, request):
        start_date = self._parse_date(request.query_params.get("start_date"), "start_date")
        end_date = self._parse_date(request.query_params.get("end_date"), "end_date")
        return Response(build_profitability(dimension="cost-centers", start_date=start_date, end_date=end_date))
