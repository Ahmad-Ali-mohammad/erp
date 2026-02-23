from decimal import Decimal

from rest_framework import serializers

from core.services.sequence import next_sequence
from .models import (
    Material,
    PurchaseOrder,
    PurchaseOrderItem,
    PurchaseRequest,
    PurchaseRequestItem,
    StockTransaction,
    Supplier,
    Warehouse,
)

LOCKED_PROJECT_STATUSES = {"completed", "cancelled"}


def _ensure_project_is_open(project):
    if project and project.status in LOCKED_PROJECT_STATUSES:
        raise serializers.ValidationError({"project": "This project is closed and cannot be modified."})


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = [
            "id",
            "code",
            "name",
            "tax_number",
            "phone",
            "email",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class WarehouseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Warehouse
        fields = ["id", "code", "name", "location", "is_active", "created_at", "updated_at"]
        read_only_fields = ["created_at", "updated_at"]


class MaterialSerializer(serializers.ModelSerializer):
    class Meta:
        model = Material
        fields = [
            "id",
            "sku",
            "name",
            "unit",
            "reorder_level",
            "preferred_supplier",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class PurchaseRequestItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = PurchaseRequestItem
        fields = [
            "id",
            "material",
            "description",
            "quantity",
            "estimated_unit_cost",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class PurchaseRequestSerializer(serializers.ModelSerializer):
    items = PurchaseRequestItemSerializer(many=True, required=False)

    class Meta:
        model = PurchaseRequest
        fields = [
            "id",
            "request_number",
            "project",
            "requested_by",
            "status",
            "needed_by",
            "notes",
            "submitted_at",
            "submitted_by",
            "approved_at",
            "approved_by",
            "rejected_at",
            "rejected_by",
            "rejection_reason",
            "items",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "requested_by",
            "status",
            "created_at",
            "updated_at",
            "submitted_at",
            "submitted_by",
            "approved_at",
            "approved_by",
            "rejected_at",
            "rejected_by",
            "rejection_reason",
        ]
        extra_kwargs = {
            "request_number": {"required": False, "allow_blank": True},
        }

    def validate(self, attrs):
        project = attrs.get("project") or getattr(self.instance, "project", None)
        _ensure_project_is_open(project)
        return attrs

    def create(self, validated_data):
        items_data = validated_data.pop("items", [])
        if not validated_data.get("request_number"):
            validated_data["request_number"] = next_sequence("purchase_request")
        request_obj = PurchaseRequest.objects.create(**validated_data)
        for item in items_data:
            PurchaseRequestItem.objects.create(purchase_request=request_obj, **item)
        return request_obj

    def update(self, instance, validated_data):
        items_data = validated_data.pop("items", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if items_data is not None:
            instance.items.all().delete()
            for item in items_data:
                PurchaseRequestItem.objects.create(purchase_request=instance, **item)

        return instance


class PurchaseOrderItemSerializer(serializers.ModelSerializer):
    line_total = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseOrderItem
        fields = [
            "id",
            "cost_code",
            "material",
            "description",
            "quantity",
            "unit_cost",
            "received_quantity",
            "line_total",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at", "line_total", "received_quantity"]

    def get_line_total(self, obj):
        return obj.quantity * obj.unit_cost


class PurchaseOrderSerializer(serializers.ModelSerializer):
    items = PurchaseOrderItemSerializer(many=True, required=False)

    class Meta:
        model = PurchaseOrder
        fields = [
            "id",
            "order_number",
            "purchase_request",
            "supplier",
            "project",
            "cost_code",
            "status",
            "order_date",
            "expected_date",
            "currency",
            "subtotal",
            "tax_amount",
            "total_amount",
            "created_by",
            "items",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "status",
            "created_by",
            "created_at",
            "updated_at",
            "subtotal",
            "tax_amount",
            "total_amount",
        ]
        extra_kwargs = {
            "order_number": {"required": False, "allow_blank": True},
        }

    def validate(self, attrs):
        items_data = attrs.get("items")
        project = attrs.get("project") or getattr(self.instance, "project", None)
        purchase_request = attrs.get("purchase_request") or getattr(self.instance, "purchase_request", None)
        cost_code = attrs.get("cost_code") if "cost_code" in attrs else getattr(self.instance, "cost_code", None)

        if project is None and purchase_request and purchase_request.project:
            project = purchase_request.project
            attrs["project"] = project

        item_cost_codes = []
        if items_data is not None:
            item_cost_codes = [item.get("cost_code") for item in items_data if item.get("cost_code")]
            unique_item_cost_codes = list({code.id: code for code in item_cost_codes}.values())
            if "cost_code" not in attrs:
                if len(unique_item_cost_codes) == 1:
                    attrs["cost_code"] = unique_item_cost_codes[0]
                    cost_code = unique_item_cost_codes[0]
                elif len(unique_item_cost_codes) > 1:
                    attrs["cost_code"] = None
                    cost_code = None

        if not project and cost_code:
            project = cost_code.project
            attrs["project"] = project

        if not project and item_cost_codes:
            project_ids = {code.project_id for code in item_cost_codes}
            if len(project_ids) == 1:
                project = item_cost_codes[0].project
                attrs["project"] = project

        if cost_code and project and cost_code.project_id != project.id:
            raise serializers.ValidationError({"cost_code": "Cost code must belong to the selected project."})
        if cost_code and not project:
            raise serializers.ValidationError({"project": "Project is required when cost_code is provided."})

        _ensure_project_is_open(project)

        if project:
            for item_code in item_cost_codes:
                if item_code.project_id != project.id:
                    raise serializers.ValidationError({"items": "Item cost_code must belong to the selected project."})

        return attrs

    def _update_totals(self, po: PurchaseOrder):
        subtotal = Decimal("0.00")
        for item in po.items.all():
            subtotal += item.quantity * item.unit_cost

        tax_amount = subtotal * Decimal("0.15")
        po.subtotal = subtotal
        po.tax_amount = tax_amount
        po.total_amount = subtotal + tax_amount
        po.save(update_fields=["subtotal", "tax_amount", "total_amount", "updated_at"])

    def create(self, validated_data):
        items_data = validated_data.pop("items", [])
        if not validated_data.get("order_number"):
            validated_data["order_number"] = next_sequence("purchase_order")
        po = PurchaseOrder.objects.create(**validated_data)
        for item in items_data:
            PurchaseOrderItem.objects.create(purchase_order=po, **item)
        self._update_totals(po)
        return po

    def update(self, instance, validated_data):
        items_data = validated_data.pop("items", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if items_data is not None:
            instance.items.all().delete()
            for item in items_data:
                PurchaseOrderItem.objects.create(purchase_order=instance, **item)

        self._update_totals(instance)
        return instance


class StockTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = StockTransaction
        fields = [
            "id",
            "material",
            "warehouse",
            "project",
            "transaction_type",
            "quantity",
            "unit_cost",
            "transaction_date",
            "reference_type",
            "reference_id",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_by", "created_at", "updated_at"]

    def validate(self, attrs):
        project = attrs.get("project") or getattr(self.instance, "project", None)
        _ensure_project_is_open(project)
        return attrs
