from decimal import Decimal

from rest_framework import serializers

from core.services.sequence import next_sequence
from .models import (
    BoQItem,
    ChangeOrder,
    ChangeOrderLine,
    CostCode,
    Project,
    ProjectBudgetLine,
    ProjectCostRecord,
    ProjectPhase,
    Subcontract,
    SubcontractPayment,
    Subcontractor,
)

LOCKED_PROJECT_STATUSES = {Project.Status.COMPLETED, Project.Status.CANCELLED}


def _ensure_project_is_open(project, field_name: str = "project"):
    if project and project.status in LOCKED_PROJECT_STATUSES:
        raise serializers.ValidationError({field_name: "This project is closed and cannot be modified."})


class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = [
            "id",
            "code",
            "name",
            "client_name",
            "description",
            "status",
            "contract_value",
            "budget",
            "currency",
            "start_date",
            "expected_end_date",
            "created_by",
            "closed_at",
            "closed_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_by", "closed_at", "closed_by", "created_at", "updated_at"]


class ProjectPhaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectPhase
        fields = [
            "id",
            "project",
            "name",
            "sequence",
            "budget",
            "planned_progress",
            "actual_progress",
            "start_date",
            "end_date",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def validate(self, attrs):
        project = attrs.get("project") or getattr(self.instance, "project", None)
        _ensure_project_is_open(project)
        return attrs


class BoQItemSerializer(serializers.ModelSerializer):
    planned_total_cost = serializers.DecimalField(max_digits=16, decimal_places=2, read_only=True)
    actual_total_cost = serializers.DecimalField(max_digits=16, decimal_places=2, read_only=True)

    class Meta:
        model = BoQItem
        fields = [
            "id",
            "project",
            "phase",
            "item_code",
            "description",
            "unit",
            "planned_quantity",
            "planned_unit_cost",
            "actual_quantity",
            "actual_unit_cost",
            "planned_total_cost",
            "actual_total_cost",
            "vendor_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at", "planned_total_cost", "actual_total_cost"]

    def validate(self, attrs):
        project = attrs.get("project") or getattr(self.instance, "project", None)
        phase = attrs.get("phase") if "phase" in attrs else getattr(self.instance, "phase", None)

        _ensure_project_is_open(project)
        if project and phase and phase.project_id != project.id:
            raise serializers.ValidationError({"phase": "Phase must belong to the selected project."})
        return attrs


class CostCodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = CostCode
        fields = [
            "id",
            "project",
            "parent",
            "code",
            "name",
            "description",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def validate(self, attrs):
        project = attrs.get("project") or getattr(self.instance, "project", None)
        parent = attrs.get("parent") or getattr(self.instance, "parent", None)

        _ensure_project_is_open(project)
        if project and parent and parent.project_id != project.id:
            raise serializers.ValidationError({"parent": "Parent cost code must belong to the same project."})
        return attrs


class ProjectBudgetLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectBudgetLine
        fields = [
            "id",
            "project",
            "cost_code",
            "baseline_amount",
            "revised_amount",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def validate(self, attrs):
        project = attrs.get("project") or getattr(self.instance, "project", None)
        cost_code = attrs.get("cost_code") or getattr(self.instance, "cost_code", None)

        _ensure_project_is_open(project)
        if project and cost_code and cost_code.project_id != project.id:
            raise serializers.ValidationError({"cost_code": "Cost code must belong to the selected project."})
        return attrs

    def create(self, validated_data):
        if "revised_amount" not in validated_data:
            validated_data["revised_amount"] = validated_data.get("baseline_amount", Decimal("0.00"))
        return super().create(validated_data)


class ProjectCostRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectCostRecord
        fields = [
            "id",
            "project",
            "cost_code",
            "record_type",
            "amount",
            "record_date",
            "source_module",
            "source_reference",
            "notes",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_by", "created_at", "updated_at"]

    def validate(self, attrs):
        project = attrs.get("project") or getattr(self.instance, "project", None)
        cost_code = attrs.get("cost_code") or getattr(self.instance, "cost_code", None)

        _ensure_project_is_open(project)
        if project and cost_code and cost_code.project_id != project.id:
            raise serializers.ValidationError({"cost_code": "Cost code must belong to the selected project."})
        return attrs


class ProjectCostSummaryLineSerializer(serializers.Serializer):
    cost_code_id = serializers.IntegerField()
    cost_code = serializers.CharField()
    cost_code_name = serializers.CharField()
    budget = serializers.DecimalField(max_digits=14, decimal_places=2)
    commitments = serializers.DecimalField(max_digits=14, decimal_places=2)
    actual = serializers.DecimalField(max_digits=14, decimal_places=2)
    available = serializers.DecimalField(max_digits=14, decimal_places=2)
    variance = serializers.DecimalField(max_digits=14, decimal_places=2)


class ProjectCostSummarySerializer(serializers.Serializer):
    project_id = serializers.IntegerField()
    project_code = serializers.CharField()
    totals = serializers.DictField(child=serializers.DecimalField(max_digits=14, decimal_places=2))
    lines = ProjectCostSummaryLineSerializer(many=True)


class ChangeOrderLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChangeOrderLine
        fields = [
            "id",
            "cost_code",
            "description",
            "contract_value_delta",
            "budget_delta",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class ChangeOrderSerializer(serializers.ModelSerializer):
    lines = ChangeOrderLineSerializer(many=True, required=False)
    total_contract_value_delta = serializers.SerializerMethodField()
    total_budget_delta = serializers.SerializerMethodField()

    class Meta:
        model = ChangeOrder
        fields = [
            "id",
            "project",
            "order_number",
            "title",
            "description",
            "status",
            "created_by",
            "submitted_at",
            "submitted_by",
            "approved_at",
            "approved_by",
            "rejected_at",
            "rejected_by",
            "rejection_reason",
            "total_contract_value_delta",
            "total_budget_delta",
            "lines",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "status",
            "created_by",
            "submitted_at",
            "submitted_by",
            "approved_at",
            "approved_by",
            "rejected_at",
            "rejected_by",
            "rejection_reason",
            "total_contract_value_delta",
            "total_budget_delta",
            "created_at",
            "updated_at",
        ]
        extra_kwargs = {
            "order_number": {"required": False, "allow_blank": True},
        }

    def get_total_contract_value_delta(self, obj):
        return obj.total_contract_value_delta()

    def get_total_budget_delta(self, obj):
        return obj.total_budget_delta()

    def validate(self, attrs):
        project = attrs.get("project") or getattr(self.instance, "project", None)
        lines = attrs.get("lines")

        _ensure_project_is_open(project)

        if self.instance and self.instance.status != ChangeOrder.Status.DRAFT:
            raise serializers.ValidationError({"status": "Only draft change orders can be modified."})

        if self.instance and "project" in attrs and attrs["project"].id != self.instance.project_id:
            raise serializers.ValidationError({"project": "Project cannot be changed after creation."})

        if lines is not None:
            for line in lines:
                cost_code = line.get("cost_code")
                if cost_code and project and cost_code.project_id != project.id:
                    raise serializers.ValidationError({"lines": "Each line cost_code must belong to the selected project."})

        return attrs

    def create(self, validated_data):
        lines_data = validated_data.pop("lines", [])
        if not validated_data.get("order_number"):
            validated_data["order_number"] = next_sequence("change_order")
        change_order = ChangeOrder.objects.create(**validated_data)
        for line in lines_data:
            ChangeOrderLine.objects.create(change_order=change_order, **line)
        return change_order

    def update(self, instance, validated_data):
        lines_data = validated_data.pop("lines", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if lines_data is not None:
            instance.lines.all().delete()
            for line_data in lines_data:
                ChangeOrderLine.objects.create(change_order=instance, **line_data)

        return instance


class SubcontractorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subcontractor
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


class SubcontractSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subcontract
        fields = [
            "id",
            "project",
            "subcontractor",
            "contract_number",
            "status",
            "contract_value",
            "retention_percent",
            "retention_amount",
            "start_date",
            "end_date",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]
        extra_kwargs = {"contract_number": {"required": False, "allow_blank": True}}

    def validate(self, attrs):
        contract_value = attrs.get("contract_value") or getattr(self.instance, "contract_value", None)
        retention_percent = attrs.get("retention_percent") or getattr(self.instance, "retention_percent", None)
        if contract_value is not None and retention_percent is not None:
            retention_amount = (contract_value * retention_percent) / Decimal("100")
            attrs["retention_amount"] = retention_amount
        return attrs

    def create(self, validated_data):
        if not validated_data.get("contract_number"):
            validated_data["contract_number"] = next_sequence("subcontract")
        return Subcontract.objects.create(**validated_data)


class SubcontractPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubcontractPayment
        fields = [
            "id",
            "subcontract",
            "payment_date",
            "amount",
            "status",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]
