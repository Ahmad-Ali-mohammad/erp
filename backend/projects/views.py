from decimal import Decimal

from django.db import transaction
from django.db.models import Q, Sum
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
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
from .models import (
    BoQItem,
    ChangeOrder,
    CostCode,
    Project,
    ProjectBudgetLine,
    ProjectCostRecord,
    ProjectPhase,
    Subcontract,
    SubcontractPayment,
    Subcontractor,
)
from .serializers import (
    BoQItemSerializer,
    ChangeOrderSerializer,
    CostCodeSerializer,
    ProjectBudgetLineSerializer,
    ProjectCostRecordSerializer,
    ProjectCostSummarySerializer,
    ProjectPhaseSerializer,
    ProjectSerializer,
    SubcontractPaymentSerializer,
    SubcontractSerializer,
    SubcontractorSerializer,
)

PROJECT_READ_ROLES = {
    ROLE_ADMIN,
    ROLE_ACCOUNTANT,
    ROLE_PROJECT_MANAGER,
    ROLE_SITE_SUPERVISOR,
    ROLE_UNASSIGNED,
}
PROJECT_WRITE_ROLES = {ROLE_ADMIN, ROLE_PROJECT_MANAGER, ROLE_UNASSIGNED}
PROJECT_APPROVER_ROLES = {ROLE_ADMIN, ROLE_PROJECT_MANAGER}
LOCKED_PROJECT_STATUSES = {Project.Status.COMPLETED, Project.Status.CANCELLED}


def _assert_project_open(project):
    if project and project.status in LOCKED_PROJECT_STATUSES:
        raise ValidationError({"project": "This project is closed and cannot be modified."})


class ProjectViewSet(AuditLogMixin, RowLevelScopeMixin, viewsets.ModelViewSet):
    queryset = Project.objects.select_related("created_by", "closed_by").all()
    serializer_class = ProjectSerializer
    permission_classes = [ActionBasedRolePermission]
    user_scope_fields = ("created_by",)
    action_role_map = {
        "list": PROJECT_READ_ROLES,
        "retrieve": PROJECT_READ_ROLES,
        "create": PROJECT_WRITE_ROLES,
        "update": PROJECT_WRITE_ROLES,
        "partial_update": PROJECT_WRITE_ROLES,
        "destroy": {ROLE_ADMIN},
        "cost_summary": PROJECT_READ_ROLES,
        "close": PROJECT_WRITE_ROLES,
    }
    filterset_fields = ["status", "currency", "created_by"]
    search_fields = ["code", "name", "client_name"]
    ordering_fields = ["created_at", "code", "name", "start_date"]

    def get_queryset(self):
        return self.apply_row_level_scope(super().get_queryset())

    def perform_create(self, serializer):
        instance = serializer.save(created_by=self.request.user)
        self.log_action(action="create", instance=instance, changes=serializer.validated_data)

    def perform_update(self, serializer):
        instance = self.get_object()
        _assert_project_open(instance)
        changes = self._build_changes(instance, serializer.validated_data)
        instance = serializer.save()
        self.log_action(action="update", instance=instance, changes=changes)

    def perform_destroy(self, instance):
        self.log_action(action="delete", instance=instance)
        instance.delete()

    @action(detail=True, methods=["get"], url_path="cost-summary")
    def cost_summary(self, request, pk=None):
        project = self.get_object()
        zero = Decimal("0.00")

        budget_map = {
            budget_line.cost_code_id: budget_line.revised_amount
            for budget_line in project.budget_lines.select_related("cost_code")
        }
        record_map = {
            row["cost_code"]: {
                "commitments": row["commitments"] or zero,
                "actual": row["actual"] or zero,
            }
            for row in project.cost_records.values("cost_code").annotate(
                commitments=Sum("amount", filter=Q(record_type=ProjectCostRecord.RecordType.COMMITMENT)),
                actual=Sum("amount", filter=Q(record_type=ProjectCostRecord.RecordType.ACTUAL)),
            )
        }

        lines = []
        for cost_code in project.cost_codes.order_by("code"):
            budget = budget_map.get(cost_code.id, zero)
            commitments = record_map.get(cost_code.id, {}).get("commitments", zero)
            actual = record_map.get(cost_code.id, {}).get("actual", zero)
            available = budget - actual
            variance = budget - actual
            lines.append(
                {
                    "cost_code_id": cost_code.id,
                    "cost_code": cost_code.code,
                    "cost_code_name": cost_code.name,
                    "budget": budget,
                    "commitments": commitments,
                    "actual": actual,
                    "available": available,
                    "variance": variance,
                }
            )

        totals = {
            "budget": sum((line["budget"] for line in lines), zero),
            "commitments": sum((line["commitments"] for line in lines), zero),
            "actual": sum((line["actual"] for line in lines), zero),
            "available": sum((line["available"] for line in lines), zero),
            "variance": sum((line["variance"] for line in lines), zero),
        }
        serializer = ProjectCostSummarySerializer(
            {
                "project_id": project.id,
                "project_code": project.code,
                "totals": totals,
                "lines": lines,
            }
        )
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def close(self, request, pk=None):
        project = self.get_object()
        if project.status in LOCKED_PROJECT_STATUSES:
            raise ValidationError({"status": "Project is already closed."})

        project.status = Project.Status.COMPLETED
        project.closed_at = timezone.now()
        project.closed_by = request.user
        project.save(update_fields=["status", "closed_at", "closed_by", "updated_at"])
        return Response(self.get_serializer(project).data)


class ProjectPhaseViewSet(AuditLogMixin, RowLevelScopeMixin, viewsets.ModelViewSet):
    queryset = ProjectPhase.objects.select_related("project").all()
    serializer_class = ProjectPhaseSerializer
    permission_classes = [ActionBasedRolePermission]
    user_scope_fields = ("project__created_by",)
    action_role_map = {
        "list": PROJECT_READ_ROLES,
        "retrieve": PROJECT_READ_ROLES,
        "create": PROJECT_WRITE_ROLES,
        "update": PROJECT_WRITE_ROLES,
        "partial_update": PROJECT_WRITE_ROLES,
        "destroy": {ROLE_ADMIN, ROLE_PROJECT_MANAGER},
    }
    filterset_fields = ["project"]
    search_fields = ["name", "project__code", "project__name"]
    ordering_fields = ["project", "sequence", "created_at"]

    def get_queryset(self):
        return self.apply_row_level_scope(super().get_queryset())

    def perform_create(self, serializer):
        project = serializer.validated_data.get("project")
        _assert_project_open(project)
        instance = serializer.save()
        self.log_action(action="create", instance=instance, changes=serializer.validated_data)

    def perform_update(self, serializer):
        instance = self.get_object()
        _assert_project_open(instance.project)
        changes = self._build_changes(instance, serializer.validated_data)
        instance = serializer.save()
        self.log_action(action="update", instance=instance, changes=changes)

    def perform_destroy(self, instance):
        _assert_project_open(instance.project)
        self.log_action(action="delete", instance=instance)
        instance.delete()


class BoQItemViewSet(AuditLogMixin, RowLevelScopeMixin, viewsets.ModelViewSet):
    queryset = BoQItem.objects.select_related("project", "phase").all()
    serializer_class = BoQItemSerializer
    permission_classes = [ActionBasedRolePermission]
    user_scope_fields = ("project__created_by",)
    action_role_map = {
        "list": PROJECT_READ_ROLES,
        "retrieve": PROJECT_READ_ROLES,
        "create": PROJECT_WRITE_ROLES,
        "update": PROJECT_WRITE_ROLES,
        "partial_update": PROJECT_WRITE_ROLES,
        "destroy": {ROLE_ADMIN, ROLE_PROJECT_MANAGER},
    }
    filterset_fields = ["project", "phase", "vendor_name"]
    search_fields = ["item_code", "description", "project__code", "vendor_name"]
    ordering_fields = ["project", "item_code", "created_at"]

    def get_queryset(self):
        return self.apply_row_level_scope(super().get_queryset())

    def perform_create(self, serializer):
        project = serializer.validated_data.get("project")
        _assert_project_open(project)
        instance = serializer.save()
        self.log_action(action="create", instance=instance, changes=serializer.validated_data)

    def perform_update(self, serializer):
        instance = self.get_object()
        _assert_project_open(instance.project)
        changes = self._build_changes(instance, serializer.validated_data)
        instance = serializer.save()
        self.log_action(action="update", instance=instance, changes=changes)

    def perform_destroy(self, instance):
        _assert_project_open(instance.project)
        self.log_action(action="delete", instance=instance)
        instance.delete()


class CostCodeViewSet(AuditLogMixin, RowLevelScopeMixin, viewsets.ModelViewSet):
    queryset = CostCode.objects.select_related("project", "parent").all()
    serializer_class = CostCodeSerializer
    permission_classes = [ActionBasedRolePermission]
    user_scope_fields = ("project__created_by",)
    action_role_map = {
        "list": PROJECT_READ_ROLES,
        "retrieve": PROJECT_READ_ROLES,
        "create": PROJECT_WRITE_ROLES,
        "update": PROJECT_WRITE_ROLES,
        "partial_update": PROJECT_WRITE_ROLES,
        "destroy": {ROLE_ADMIN, ROLE_PROJECT_MANAGER},
    }
    filterset_fields = ["project", "parent", "is_active"]
    search_fields = ["code", "name", "project__code"]
    ordering_fields = ["project", "code", "name", "created_at"]

    def get_queryset(self):
        return self.apply_row_level_scope(super().get_queryset())

    def perform_create(self, serializer):
        project = serializer.validated_data.get("project")
        _assert_project_open(project)
        instance = serializer.save()
        self.log_action(action="create", instance=instance, changes=serializer.validated_data)

    def perform_update(self, serializer):
        instance = self.get_object()
        _assert_project_open(instance.project)
        changes = self._build_changes(instance, serializer.validated_data)
        instance = serializer.save()
        self.log_action(action="update", instance=instance, changes=changes)

    def perform_destroy(self, instance):
        _assert_project_open(instance.project)
        self.log_action(action="delete", instance=instance)
        instance.delete()


class ProjectBudgetLineViewSet(AuditLogMixin, RowLevelScopeMixin, viewsets.ModelViewSet):
    queryset = ProjectBudgetLine.objects.select_related("project", "cost_code").all()
    serializer_class = ProjectBudgetLineSerializer
    permission_classes = [ActionBasedRolePermission]
    user_scope_fields = ("project__created_by",)
    action_role_map = {
        "list": PROJECT_READ_ROLES,
        "retrieve": PROJECT_READ_ROLES,
        "create": PROJECT_WRITE_ROLES,
        "update": PROJECT_WRITE_ROLES,
        "partial_update": PROJECT_WRITE_ROLES,
        "destroy": {ROLE_ADMIN, ROLE_PROJECT_MANAGER},
    }
    filterset_fields = ["project", "cost_code"]
    search_fields = ["project__code", "cost_code__code", "cost_code__name"]
    ordering_fields = ["project", "cost_code", "created_at"]

    def get_queryset(self):
        return self.apply_row_level_scope(super().get_queryset())

    def perform_create(self, serializer):
        project = serializer.validated_data.get("project")
        _assert_project_open(project)
        instance = serializer.save()
        self.log_action(action="create", instance=instance, changes=serializer.validated_data)

    def perform_update(self, serializer):
        instance = self.get_object()
        _assert_project_open(instance.project)
        changes = self._build_changes(instance, serializer.validated_data)
        instance = serializer.save()
        self.log_action(action="update", instance=instance, changes=changes)

    def perform_destroy(self, instance):
        _assert_project_open(instance.project)
        self.log_action(action="delete", instance=instance)
        instance.delete()


class ProjectCostRecordViewSet(AuditLogMixin, RowLevelScopeMixin, viewsets.ModelViewSet):
    queryset = ProjectCostRecord.objects.select_related("project", "cost_code", "created_by").all()
    serializer_class = ProjectCostRecordSerializer
    permission_classes = [ActionBasedRolePermission]
    user_scope_fields = ("project__created_by", "created_by")
    action_role_map = {
        "list": PROJECT_READ_ROLES,
        "retrieve": PROJECT_READ_ROLES,
        "create": PROJECT_WRITE_ROLES,
        "update": PROJECT_WRITE_ROLES,
        "partial_update": PROJECT_WRITE_ROLES,
        "destroy": {ROLE_ADMIN, ROLE_PROJECT_MANAGER},
    }
    filterset_fields = ["project", "cost_code", "record_type", "record_date", "source_module"]
    search_fields = ["project__code", "cost_code__code", "source_reference"]
    ordering_fields = ["record_date", "amount", "created_at"]

    def get_queryset(self):
        return self.apply_row_level_scope(super().get_queryset())

    def perform_create(self, serializer):
        instance = serializer.save(created_by=self.request.user)
        self.log_action(action="create", instance=instance, changes=serializer.validated_data)

    def perform_update(self, serializer):
        instance = self.get_object()
        _assert_project_open(instance.project)
        changes = self._build_changes(instance, serializer.validated_data)
        instance = serializer.save()
        self.log_action(action="update", instance=instance, changes=changes)

    def perform_destroy(self, instance):
        _assert_project_open(instance.project)
        self.log_action(action="delete", instance=instance)
        instance.delete()


class ChangeOrderViewSet(AuditLogMixin, RowLevelScopeMixin, viewsets.ModelViewSet):
    queryset = ChangeOrder.objects.prefetch_related("lines").select_related(
        "project",
        "created_by",
        "submitted_by",
        "approved_by",
        "rejected_by",
    )
    serializer_class = ChangeOrderSerializer
    permission_classes = [ActionBasedRolePermission]
    user_scope_fields = (
        "project__created_by",
        "created_by",
        "submitted_by",
        "approved_by",
        "rejected_by",
    )
    action_role_map = {
        "list": PROJECT_READ_ROLES,
        "retrieve": PROJECT_READ_ROLES,
        "create": PROJECT_WRITE_ROLES,
        "update": PROJECT_WRITE_ROLES,
        "partial_update": PROJECT_WRITE_ROLES,
        "destroy": {ROLE_ADMIN, ROLE_PROJECT_MANAGER},
        "submit": PROJECT_WRITE_ROLES,
        "approve": PROJECT_APPROVER_ROLES,
        "reject": PROJECT_APPROVER_ROLES,
    }
    filterset_fields = ["project", "status", "created_by"]
    search_fields = ["order_number", "title", "project__code"]
    ordering_fields = ["created_at", "order_number", "approved_at"]

    def get_queryset(self):
        return self.apply_row_level_scope(super().get_queryset())

    def perform_create(self, serializer):
        project = serializer.validated_data.get("project")
        _assert_project_open(project)
        instance = serializer.save(created_by=self.request.user)
        self.log_action(action="create", instance=instance, changes=serializer.validated_data)

    def perform_update(self, serializer):
        instance = self.get_object()
        _assert_project_open(instance.project)
        changes = self._build_changes(instance, serializer.validated_data)
        instance = serializer.save()
        self.log_action(action="update", instance=instance, changes=changes)

    def perform_destroy(self, instance):
        if instance.status != ChangeOrder.Status.DRAFT:
            raise ValidationError({"status": "Only draft change orders can be deleted."})
        _assert_project_open(instance.project)
        self.log_action(action="delete", instance=instance)
        instance.delete()

    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        change_order = self.get_object()
        if change_order.status != ChangeOrder.Status.DRAFT:
            raise ValidationError({"status": "Only draft change orders can be submitted."})
        if not change_order.lines.exists():
            raise ValidationError({"lines": "Change order must contain at least one line before submission."})
        _assert_project_open(change_order.project)

        change_order.status = ChangeOrder.Status.PENDING_APPROVAL
        change_order.submitted_at = timezone.now()
        change_order.submitted_by = request.user
        change_order.approved_at = None
        change_order.approved_by = None
        change_order.rejected_at = None
        change_order.rejected_by = None
        change_order.rejection_reason = ""
        change_order.save(
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
        return Response(self.get_serializer(change_order).data)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        change_order = self.get_object()
        if change_order.status != ChangeOrder.Status.PENDING_APPROVAL:
            raise ValidationError({"status": "Only submitted change orders can be approved."})
        if not change_order.submitted_at:
            raise ValidationError({"status": "Change order must be submitted before approval."})

        with transaction.atomic():
            change_order = (
                ChangeOrder.objects.select_for_update()
                .select_related("project")
                .prefetch_related("lines__cost_code")
                .get(pk=change_order.pk)
            )
            if change_order.status != ChangeOrder.Status.PENDING_APPROVAL:
                raise ValidationError({"status": "Only submitted change orders can be approved."})

            project = change_order.project
            _assert_project_open(project)

            contract_delta = change_order.total_contract_value_delta()
            budget_delta = change_order.total_budget_delta()

            new_contract_value = project.contract_value + contract_delta
            new_budget = project.budget + budget_delta
            if new_contract_value < Decimal("0.00"):
                raise ValidationError({"contract_value": "Change order would make project contract value negative."})
            if new_budget < Decimal("0.00"):
                raise ValidationError({"budget": "Change order would make project budget negative."})

            project.contract_value = new_contract_value
            project.budget = new_budget
            project.save(update_fields=["contract_value", "budget", "updated_at"])

            for line in change_order.lines.all():
                if not line.cost_code:
                    continue
                budget_line, _ = ProjectBudgetLine.objects.get_or_create(
                    project=project,
                    cost_code=line.cost_code,
                    defaults={
                        "baseline_amount": Decimal("0.00"),
                        "revised_amount": Decimal("0.00"),
                    },
                )
                revised_amount = budget_line.revised_amount + line.budget_delta
                if revised_amount < Decimal("0.00"):
                    raise ValidationError({"budget": f"Cost code {line.cost_code.code} budget cannot be negative."})
                budget_line.revised_amount = revised_amount
                budget_line.save(update_fields=["revised_amount", "updated_at"])

            change_order.status = ChangeOrder.Status.APPROVED
            change_order.approved_at = timezone.now()
            change_order.approved_by = request.user
            change_order.rejected_at = None
            change_order.rejected_by = None
            change_order.rejection_reason = ""
            change_order.save(
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

        change_order.refresh_from_db()
        return Response(self.get_serializer(change_order).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        change_order = self.get_object()
        if change_order.status != ChangeOrder.Status.PENDING_APPROVAL:
            raise ValidationError({"status": "Only submitted change orders can be rejected."})
        if not change_order.submitted_at:
            raise ValidationError({"status": "Change order must be submitted before rejection."})

        reason = str(request.data.get("reason", "")).strip()
        if not reason:
            raise ValidationError({"reason": "A rejection reason is required."})

        change_order.status = ChangeOrder.Status.REJECTED
        change_order.approved_at = None
        change_order.approved_by = None
        change_order.rejected_at = timezone.now()
        change_order.rejected_by = request.user
        change_order.rejection_reason = reason
        change_order.save(
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
        return Response(self.get_serializer(change_order).data)


class SubcontractorViewSet(AuditLogMixin, viewsets.ModelViewSet):
    queryset = Subcontractor.objects.all()
    serializer_class = SubcontractorSerializer
    permission_classes = [ActionBasedRolePermission]
    action_role_map = {
        "list": PROJECT_READ_ROLES,
        "retrieve": PROJECT_READ_ROLES,
        "create": PROJECT_WRITE_ROLES,
        "update": PROJECT_WRITE_ROLES,
        "partial_update": PROJECT_WRITE_ROLES,
        "destroy": {ROLE_ADMIN},
    }
    filterset_fields = ["is_active"]
    search_fields = ["code", "name", "tax_number"]
    ordering_fields = ["name", "code", "created_at"]


class SubcontractViewSet(AuditLogMixin, RowLevelScopeMixin, viewsets.ModelViewSet):
    queryset = Subcontract.objects.select_related("project", "subcontractor").all()
    serializer_class = SubcontractSerializer
    permission_classes = [ActionBasedRolePermission]
    user_scope_fields = ("project__created_by",)
    action_role_map = {
        "list": PROJECT_READ_ROLES,
        "retrieve": PROJECT_READ_ROLES,
        "create": PROJECT_WRITE_ROLES,
        "update": PROJECT_WRITE_ROLES,
        "partial_update": PROJECT_WRITE_ROLES,
        "destroy": {ROLE_ADMIN, ROLE_PROJECT_MANAGER},
    }
    filterset_fields = ["project", "subcontractor", "status"]
    search_fields = ["contract_number", "project__code", "subcontractor__name"]
    ordering_fields = ["created_at", "contract_number"]

    def get_queryset(self):
        return self.apply_row_level_scope(super().get_queryset())


class SubcontractPaymentViewSet(AuditLogMixin, RowLevelScopeMixin, viewsets.ModelViewSet):
    queryset = SubcontractPayment.objects.select_related("subcontract", "subcontract__project").all()
    serializer_class = SubcontractPaymentSerializer
    permission_classes = [ActionBasedRolePermission]
    user_scope_fields = ("subcontract__project__created_by",)
    action_role_map = {
        "list": PROJECT_READ_ROLES,
        "retrieve": PROJECT_READ_ROLES,
        "create": PROJECT_WRITE_ROLES,
        "update": PROJECT_WRITE_ROLES,
        "partial_update": PROJECT_WRITE_ROLES,
        "destroy": {ROLE_ADMIN, ROLE_PROJECT_MANAGER},
    }
    filterset_fields = ["subcontract", "status", "payment_date"]
    search_fields = ["subcontract__contract_number"]
    ordering_fields = ["payment_date", "created_at"]

    def get_queryset(self):
        return self.apply_row_level_scope(super().get_queryset())
