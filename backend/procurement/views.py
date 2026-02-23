from decimal import Decimal, InvalidOperation

from django.db import transaction
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from core.access import (
    ActionBasedRolePermission,
    ROLE_ACCOUNTANT,
    ROLE_ADMIN,
    ROLE_PROJECT_MANAGER,
    ROLE_SITE_SUPERVISOR,
    ROLE_UNASSIGNED,
    RowLevelScopeMixin,
)
from core.audit import AuditLogMixin
from projects.models import ProjectCostRecord
from projects.services import settle_project_cost_records_by_source, sync_project_cost_records_by_source
from .models import (
    Material,
    PurchaseOrder,
    PurchaseRequest,
    StockTransaction,
    Supplier,
    Warehouse,
)
from .serializers import (
    MaterialSerializer,
    PurchaseOrderSerializer,
    PurchaseRequestSerializer,
    StockTransactionSerializer,
    SupplierSerializer,
    WarehouseSerializer,
)

PROCUREMENT_APPROVER_ROLE_SLUGS = {"admin", "project-manager"}
PROCUREMENT_READ_ROLES = {
    ROLE_ADMIN,
    ROLE_ACCOUNTANT,
    ROLE_PROJECT_MANAGER,
    ROLE_SITE_SUPERVISOR,
    ROLE_UNASSIGNED,
}
PROCUREMENT_WRITE_ROLES = {ROLE_ADMIN, ROLE_PROJECT_MANAGER, ROLE_SITE_SUPERVISOR, ROLE_UNASSIGNED}
PROCUREMENT_APPROVER_ROLES = {ROLE_ADMIN, ROLE_PROJECT_MANAGER}
PROCUREMENT_MASTER_DATA_WRITE_ROLES = {ROLE_ADMIN, ROLE_PROJECT_MANAGER, ROLE_UNASSIGNED}
PROCUREMENT_PO_MANAGE_ROLES = {ROLE_ADMIN, ROLE_PROJECT_MANAGER, ROLE_UNASSIGNED}
PROCUREMENT_PO_RECEIVE_ROLES = {ROLE_ADMIN, ROLE_PROJECT_MANAGER, ROLE_SITE_SUPERVISOR, ROLE_UNASSIGNED}
PROCUREMENT_PO_CANCEL_ROLES = {ROLE_ADMIN, ROLE_PROJECT_MANAGER}
LOCKED_PROJECT_STATUSES = {"completed", "cancelled"}


def _is_procurement_approver(user) -> bool:
    if not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
    role = getattr(user, "role", None)
    return bool(role and role.slug in PROCUREMENT_APPROVER_ROLE_SLUGS)


def _assert_project_open(project):
    if project and project.status in LOCKED_PROJECT_STATUSES:
        raise ValidationError({"project": "This project is closed and cannot be modified."})


def _resolve_purchase_order_project(purchase_order: PurchaseOrder):
    return purchase_order.project or (
        purchase_order.purchase_request.project if purchase_order.purchase_request else None
    )


def _build_purchase_order_cost_amount_map(purchase_order: PurchaseOrder) -> dict:
    if purchase_order.cost_code:
        return {purchase_order.cost_code: purchase_order.total_amount}

    grouped_map = {}
    for item in purchase_order.items.select_related("cost_code").all():
        if not item.cost_code:
            continue
        line_subtotal = item.quantity * item.unit_cost
        line_total = line_subtotal * Decimal("1.15")

        key = item.cost_code_id
        if key in grouped_map:
            grouped_map[key]["amount"] += line_total
        else:
            grouped_map[key] = {"cost_code": item.cost_code, "amount": line_total}

    return {entry["cost_code"]: entry["amount"] for entry in grouped_map.values()}


class SupplierViewSet(AuditLogMixin, viewsets.ModelViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    permission_classes = [ActionBasedRolePermission]
    action_role_map = {
        "list": PROCUREMENT_READ_ROLES,
        "retrieve": PROCUREMENT_READ_ROLES,
        "create": PROCUREMENT_MASTER_DATA_WRITE_ROLES,
        "update": PROCUREMENT_MASTER_DATA_WRITE_ROLES,
        "partial_update": PROCUREMENT_MASTER_DATA_WRITE_ROLES,
        "destroy": {ROLE_ADMIN, ROLE_PROJECT_MANAGER},
    }
    filterset_fields = ["is_active"]
    search_fields = ["code", "name", "tax_number"]
    ordering_fields = ["name", "code", "created_at"]

    def perform_create(self, serializer):
        instance = serializer.save()
        self.log_action(action="create", instance=instance, changes=serializer.validated_data)

    def perform_update(self, serializer):
        instance = self.get_object()
        changes = self._build_changes(instance, serializer.validated_data)
        instance = serializer.save()
        self.log_action(action="update", instance=instance, changes=changes)

    def perform_destroy(self, instance):
        self.log_action(action="delete", instance=instance)
        instance.delete()


class WarehouseViewSet(AuditLogMixin, viewsets.ModelViewSet):
    queryset = Warehouse.objects.all()
    serializer_class = WarehouseSerializer
    permission_classes = [ActionBasedRolePermission]
    action_role_map = {
        "list": PROCUREMENT_READ_ROLES,
        "retrieve": PROCUREMENT_READ_ROLES,
        "create": PROCUREMENT_MASTER_DATA_WRITE_ROLES,
        "update": PROCUREMENT_MASTER_DATA_WRITE_ROLES,
        "partial_update": PROCUREMENT_MASTER_DATA_WRITE_ROLES,
        "destroy": {ROLE_ADMIN, ROLE_PROJECT_MANAGER},
    }
    filterset_fields = ["is_active"]
    search_fields = ["code", "name", "location"]
    ordering_fields = ["code", "name", "created_at"]

    def perform_create(self, serializer):
        instance = serializer.save()
        self.log_action(action="create", instance=instance, changes=serializer.validated_data)

    def perform_update(self, serializer):
        instance = self.get_object()
        changes = self._build_changes(instance, serializer.validated_data)
        instance = serializer.save()
        self.log_action(action="update", instance=instance, changes=changes)

    def perform_destroy(self, instance):
        self.log_action(action="delete", instance=instance)
        instance.delete()


class MaterialViewSet(AuditLogMixin, viewsets.ModelViewSet):
    queryset = Material.objects.select_related("preferred_supplier").all()
    serializer_class = MaterialSerializer
    permission_classes = [ActionBasedRolePermission]
    action_role_map = {
        "list": PROCUREMENT_READ_ROLES,
        "retrieve": PROCUREMENT_READ_ROLES,
        "create": PROCUREMENT_MASTER_DATA_WRITE_ROLES,
        "update": PROCUREMENT_MASTER_DATA_WRITE_ROLES,
        "partial_update": PROCUREMENT_MASTER_DATA_WRITE_ROLES,
        "destroy": {ROLE_ADMIN, ROLE_PROJECT_MANAGER},
    }
    filterset_fields = ["preferred_supplier"]
    search_fields = ["sku", "name"]
    ordering_fields = ["sku", "name", "created_at"]

    def perform_create(self, serializer):
        instance = serializer.save()
        self.log_action(action="create", instance=instance, changes=serializer.validated_data)

    def perform_update(self, serializer):
        instance = self.get_object()
        changes = self._build_changes(instance, serializer.validated_data)
        instance = serializer.save()
        self.log_action(action="update", instance=instance, changes=changes)

    def perform_destroy(self, instance):
        self.log_action(action="delete", instance=instance)
        instance.delete()


class PurchaseRequestViewSet(AuditLogMixin, RowLevelScopeMixin, viewsets.ModelViewSet):
    queryset = PurchaseRequest.objects.prefetch_related("items").select_related("project", "requested_by")
    serializer_class = PurchaseRequestSerializer
    permission_classes = [ActionBasedRolePermission]
    user_scope_fields = (
        "requested_by",
        "submitted_by",
        "approved_by",
        "rejected_by",
        "project__created_by",
    )
    action_role_map = {
        "list": PROCUREMENT_READ_ROLES,
        "retrieve": PROCUREMENT_READ_ROLES,
        "create": PROCUREMENT_WRITE_ROLES,
        "update": PROCUREMENT_WRITE_ROLES,
        "partial_update": PROCUREMENT_WRITE_ROLES,
        "destroy": {ROLE_ADMIN, ROLE_PROJECT_MANAGER},
        "submit": PROCUREMENT_WRITE_ROLES,
        "approve": PROCUREMENT_APPROVER_ROLES,
        "reject": PROCUREMENT_APPROVER_ROLES,
    }
    filterset_fields = ["status", "project", "requested_by", "needed_by"]
    search_fields = ["request_number", "project__code"]
    ordering_fields = ["created_at", "needed_by", "request_number"]

    def get_queryset(self):
        return self.apply_row_level_scope(super().get_queryset())

    def perform_create(self, serializer):
        instance = serializer.save(requested_by=self.request.user)
        self.log_action(action="create", instance=instance, changes=serializer.validated_data)

    def perform_update(self, serializer):
        instance = self.get_object()
        changes = self._build_changes(instance, serializer.validated_data)
        instance = serializer.save()
        self.log_action(action="update", instance=instance, changes=changes)

    def perform_destroy(self, instance):
        self.log_action(action="delete", instance=instance)
        instance.delete()

    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        purchase_request = self.get_object()
        _assert_project_open(purchase_request.project)
        if purchase_request.status != PurchaseRequest.Status.DRAFT:
            raise ValidationError({"status": "Only draft purchase requests can be submitted."})
        if not purchase_request.items.exists():
            raise ValidationError({"items": "Purchase request must contain at least one item before submission."})

        purchase_request.status = PurchaseRequest.Status.PENDING_APPROVAL
        purchase_request.submitted_at = timezone.now()
        purchase_request.submitted_by = request.user
        purchase_request.approved_at = None
        purchase_request.approved_by = None
        purchase_request.rejected_at = None
        purchase_request.rejected_by = None
        purchase_request.rejection_reason = ""
        purchase_request.save(
            update_fields=[
                "status",
                "submitted_at",
                "submitted_by",
                "approved_at",
                "approved_by",
                "rejected_at",
                "rejected_by",
                "rejection_reason",
                "updated_at",
            ]
        )
        return Response(self.get_serializer(purchase_request).data)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        purchase_request = self.get_object()
        _assert_project_open(purchase_request.project)
        if not _is_procurement_approver(request.user):
            raise PermissionDenied("You are not allowed to approve purchase requests.")
        if purchase_request.status != PurchaseRequest.Status.PENDING_APPROVAL:
            raise ValidationError({"status": "Only submitted purchase requests can be approved."})
        if not purchase_request.submitted_at:
            raise ValidationError({"status": "Purchase request must be submitted before approval."})

        purchase_request.status = PurchaseRequest.Status.APPROVED
        purchase_request.approved_at = timezone.now()
        purchase_request.approved_by = request.user
        purchase_request.rejected_at = None
        purchase_request.rejected_by = None
        purchase_request.rejection_reason = ""
        purchase_request.save(
            update_fields=[
                "status",
                "approved_at",
                "approved_by",
                "rejected_at",
                "rejected_by",
                "rejection_reason",
                "updated_at",
            ]
        )
        return Response(self.get_serializer(purchase_request).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        purchase_request = self.get_object()
        if not _is_procurement_approver(request.user):
            raise PermissionDenied("You are not allowed to reject purchase requests.")
        if purchase_request.status != PurchaseRequest.Status.PENDING_APPROVAL:
            raise ValidationError({"status": "Only submitted purchase requests can be rejected."})
        if not purchase_request.submitted_at:
            raise ValidationError({"status": "Purchase request must be submitted before rejection."})

        reason = str(request.data.get("reason", "")).strip()
        if not reason:
            raise ValidationError({"reason": "A rejection reason is required."})

        purchase_request.status = PurchaseRequest.Status.REJECTED
        purchase_request.approved_at = None
        purchase_request.approved_by = None
        purchase_request.rejected_at = timezone.now()
        purchase_request.rejected_by = request.user
        purchase_request.rejection_reason = reason
        purchase_request.save(
            update_fields=[
                "status",
                "approved_at",
                "approved_by",
                "rejected_at",
                "rejected_by",
                "rejection_reason",
                "updated_at",
            ]
        )
        return Response(self.get_serializer(purchase_request).data)


class PurchaseOrderViewSet(AuditLogMixin, RowLevelScopeMixin, viewsets.ModelViewSet):
    queryset = PurchaseOrder.objects.prefetch_related("items").select_related(
        "purchase_request", "supplier", "project", "cost_code", "created_by"
    )
    serializer_class = PurchaseOrderSerializer
    permission_classes = [ActionBasedRolePermission]
    user_scope_fields = (
        "created_by",
        "project__created_by",
        "purchase_request__requested_by",
        "purchase_request__project__created_by",
    )
    action_role_map = {
        "list": PROCUREMENT_READ_ROLES,
        "retrieve": PROCUREMENT_READ_ROLES,
        "create": PROCUREMENT_PO_MANAGE_ROLES,
        "update": PROCUREMENT_PO_MANAGE_ROLES,
        "partial_update": PROCUREMENT_PO_MANAGE_ROLES,
        "destroy": PROCUREMENT_PO_CANCEL_ROLES,
        "send": PROCUREMENT_PO_MANAGE_ROLES,
        "receive": PROCUREMENT_PO_RECEIVE_ROLES,
        "cancel": PROCUREMENT_PO_CANCEL_ROLES,
    }
    filterset_fields = ["status", "supplier", "project", "cost_code", "order_date"]
    search_fields = ["order_number", "supplier__name", "project__code", "cost_code__code"]
    ordering_fields = ["order_date", "created_at", "order_number", "total_amount"]

    def get_queryset(self):
        return self.apply_row_level_scope(super().get_queryset())

    def _validate_purchase_request_for_order(self, purchase_request):
        if purchase_request and purchase_request.status not in {
            PurchaseRequest.Status.APPROVED,
            PurchaseRequest.Status.ORDERED,
        }:
            raise ValidationError(
                {"purchase_request": "Purchase order can be created only from approved purchase requests."}
            )

    def perform_create(self, serializer):
        self._validate_purchase_request_for_order(serializer.validated_data.get("purchase_request"))
        instance = serializer.save(created_by=self.request.user)
        self.log_action(action="create", instance=instance, changes=serializer.validated_data)

    def perform_update(self, serializer):
        purchase_order = self.get_object()
        if purchase_order.status != PurchaseOrder.Status.DRAFT:
            raise ValidationError({"status": "Only draft purchase orders can be modified."})
        self._validate_purchase_request_for_order(serializer.validated_data.get("purchase_request"))
        changes = self._build_changes(purchase_order, serializer.validated_data)
        instance = serializer.save()
        self.log_action(action="update", instance=instance, changes=changes)

    def perform_destroy(self, instance):
        if instance.status != PurchaseOrder.Status.DRAFT:
            raise ValidationError({"status": "Only draft purchase orders can be deleted."})
        self.log_action(action="delete", instance=instance)
        instance.delete()

    @action(detail=True, methods=["post"])
    def send(self, request, pk=None):
        purchase_order = self.get_object()
        _assert_project_open(_resolve_purchase_order_project(purchase_order))
        if purchase_order.status != PurchaseOrder.Status.DRAFT:
            raise ValidationError({"status": "Only draft purchase orders can be sent."})

        with transaction.atomic():
            purchase_order = (
                PurchaseOrder.objects.select_for_update().select_related("purchase_request").get(pk=purchase_order.pk)
            )
            if purchase_order.status != PurchaseOrder.Status.DRAFT:
                raise ValidationError({"status": "Only draft purchase orders can be sent."})
            if not purchase_order.items.exists():
                raise ValidationError({"items": "Purchase order must contain at least one item before sending."})
            if purchase_order.total_amount <= Decimal("0.00"):
                raise ValidationError({"total_amount": "Purchase order total must be greater than zero."})
            self._validate_purchase_request_for_order(purchase_order.purchase_request)

            purchase_order.status = PurchaseOrder.Status.SENT
            purchase_order.save(update_fields=["status", "updated_at"])

            if purchase_order.purchase_request and purchase_order.purchase_request.status == PurchaseRequest.Status.APPROVED:
                purchase_order.purchase_request.status = PurchaseRequest.Status.ORDERED
                purchase_order.purchase_request.save(update_fields=["status", "updated_at"])

            cost_project = _resolve_purchase_order_project(purchase_order)
            sync_project_cost_records_by_source(
                project=cost_project,
                record_type=ProjectCostRecord.RecordType.COMMITMENT,
                source_module="procurement.purchase_order",
                source_reference=purchase_order.order_number,
                record_date=purchase_order.order_date,
                created_by=request.user,
                amount_by_cost_code=_build_purchase_order_cost_amount_map(purchase_order),
                notes_prefix="Auto-synced from purchase order ",
            )

        purchase_order.refresh_from_db()
        return Response(self.get_serializer(purchase_order).data)

    @action(detail=True, methods=["post"])
    def receive(self, request, pk=None):
        purchase_order = self.get_object()
        _assert_project_open(_resolve_purchase_order_project(purchase_order))
        if purchase_order.status not in {PurchaseOrder.Status.SENT, PurchaseOrder.Status.PARTIALLY_RECEIVED}:
            raise ValidationError({"status": "Only sent purchase orders can be received."})

        receipt_lines = request.data.get("items")
        if not isinstance(receipt_lines, list) or not receipt_lines:
            raise ValidationError({"items": "Provide at least one item receipt line."})

        with transaction.atomic():
            purchase_order = PurchaseOrder.objects.select_for_update().get(pk=purchase_order.pk)
            if purchase_order.status not in {PurchaseOrder.Status.SENT, PurchaseOrder.Status.PARTIALLY_RECEIVED}:
                raise ValidationError({"status": "Only sent purchase orders can be received."})

            order_items = {item.id: item for item in purchase_order.items.select_for_update()}
            if not order_items:
                raise ValidationError({"items": "Purchase order has no items to receive."})

            applied_count = 0
            for index, line in enumerate(receipt_lines):
                if not isinstance(line, dict):
                    raise ValidationError({"items": {index: "Each line must contain item_id and quantity."}})

                raw_item_id = line.get("item_id", line.get("id"))
                try:
                    item_id = int(raw_item_id)
                except (TypeError, ValueError):
                    raise ValidationError({"items": {index: "item_id is required and must be an integer."}})

                item = order_items.get(item_id)
                if item is None:
                    raise ValidationError({"items": {index: "Item does not belong to this purchase order."}})

                raw_quantity = str(line.get("quantity", "")).strip()
                try:
                    receive_quantity = Decimal(raw_quantity)
                except InvalidOperation:
                    raise ValidationError({"items": {index: "quantity must be a valid decimal number."}})

                if receive_quantity <= Decimal("0.000"):
                    raise ValidationError({"items": {index: "quantity must be greater than zero."}})

                remaining_quantity = item.quantity - item.received_quantity
                if remaining_quantity <= Decimal("0.000"):
                    raise ValidationError({"items": {index: "Item is already fully received."}})
                if receive_quantity > remaining_quantity:
                    raise ValidationError(
                        {"items": {index: f"quantity exceeds remaining quantity ({remaining_quantity})."}}
                    )

                item.received_quantity += receive_quantity
                item.save(update_fields=["received_quantity", "updated_at"])
                applied_count += 1

            if applied_count == 0:
                raise ValidationError({"items": "No receipt lines were applied."})

            items_after_receipt = list(order_items.values())
            fully_received = all(item.received_quantity >= item.quantity for item in items_after_receipt)
            any_received = any(item.received_quantity > Decimal("0.000") for item in items_after_receipt)
            new_status = PurchaseOrder.Status.SENT
            if fully_received:
                new_status = PurchaseOrder.Status.RECEIVED
            elif any_received:
                new_status = PurchaseOrder.Status.PARTIALLY_RECEIVED

            if purchase_order.status != new_status:
                purchase_order.status = new_status
                purchase_order.save(update_fields=["status", "updated_at"])

        purchase_order.refresh_from_db()
        return Response(self.get_serializer(purchase_order).data)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        purchase_order = self.get_object()
        _assert_project_open(_resolve_purchase_order_project(purchase_order))
        if purchase_order.status == PurchaseOrder.Status.CANCELLED:
            raise ValidationError({"status": "Purchase order is already cancelled."})
        if purchase_order.status == PurchaseOrder.Status.RECEIVED:
            raise ValidationError({"status": "Received purchase orders cannot be cancelled."})
        if purchase_order.status not in {
            PurchaseOrder.Status.DRAFT,
            PurchaseOrder.Status.SENT,
            PurchaseOrder.Status.PARTIALLY_RECEIVED,
        }:
            raise ValidationError({"status": "Purchase order cannot be cancelled in its current status."})

        purchase_order.status = PurchaseOrder.Status.CANCELLED
        purchase_order.save(update_fields=["status", "updated_at"])
        settle_project_cost_records_by_source(
            record_type=ProjectCostRecord.RecordType.COMMITMENT,
            source_module="procurement.purchase_order",
            source_reference=purchase_order.order_number,
        )
        return Response(self.get_serializer(purchase_order).data)


class StockTransactionViewSet(AuditLogMixin, RowLevelScopeMixin, viewsets.ModelViewSet):
    queryset = StockTransaction.objects.select_related("material", "warehouse", "project", "created_by")
    serializer_class = StockTransactionSerializer
    permission_classes = [ActionBasedRolePermission]
    user_scope_fields = ("created_by", "project__created_by")
    action_role_map = {
        "list": PROCUREMENT_READ_ROLES,
        "retrieve": PROCUREMENT_READ_ROLES,
        "create": PROCUREMENT_WRITE_ROLES,
        "update": PROCUREMENT_WRITE_ROLES,
        "partial_update": PROCUREMENT_WRITE_ROLES,
        "destroy": {ROLE_ADMIN, ROLE_PROJECT_MANAGER},
    }
    filterset_fields = ["transaction_type", "material", "warehouse", "project", "transaction_date"]
    search_fields = ["material__sku", "warehouse__code", "reference_type", "reference_id"]
    ordering_fields = ["transaction_date", "created_at", "quantity"]

    def get_queryset(self):
        return self.apply_row_level_scope(super().get_queryset())

    def perform_create(self, serializer):
        instance = serializer.save(created_by=self.request.user)
        self.log_action(action="create", instance=instance, changes=serializer.validated_data)

    def perform_update(self, serializer):
        instance = self.get_object()
        changes = self._build_changes(instance, serializer.validated_data)
        instance = serializer.save()
        self.log_action(action="update", instance=instance, changes=changes)

    def perform_destroy(self, instance):
        self.log_action(action="delete", instance=instance)
        instance.delete()
