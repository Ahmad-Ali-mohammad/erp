from django.utils import timezone
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from core.access import (
    ActionBasedRolePermission,
    ROLE_ACCOUNTANT,
    ROLE_ADMIN,
    ROLE_PROJECT_MANAGER,
    ROLE_UNASSIGNED,
    RowLevelScopeMixin,
)
from core.audit import AuditLogMixin
from payments.models import PaymentAllocation
from payments.serializers import PaymentAllocationDetailSerializer
from .models import (
    Building,
    Handover,
    Installment,
    PaymentSchedule,
    RealEstateProject,
    Reservation,
    SalesContract,
    Unit,
    UnitPricing,
    UnitType,
)
from .serializers import (
    BuildingSerializer,
    HandoverSerializer,
    InstallmentSerializer,
    PaymentScheduleSerializer,
    RealEstateProjectSerializer,
    ReservationSerializer,
    SalesContractSerializer,
    UnitPricingSerializer,
    UnitSerializer,
    UnitTypeSerializer,
)

REAL_ESTATE_READ_ROLES = {ROLE_ADMIN, ROLE_ACCOUNTANT, ROLE_PROJECT_MANAGER, ROLE_UNASSIGNED}
REAL_ESTATE_WRITE_ROLES = {ROLE_ADMIN, ROLE_PROJECT_MANAGER}
REAL_ESTATE_SALES_ROLES = {ROLE_ADMIN, ROLE_ACCOUNTANT, ROLE_PROJECT_MANAGER}


class RealEstateProjectViewSet(AuditLogMixin, RowLevelScopeMixin, viewsets.ModelViewSet):
    queryset = RealEstateProject.objects.select_related("created_by").all()
    serializer_class = RealEstateProjectSerializer
    permission_classes = [ActionBasedRolePermission]
    user_scope_fields = ("created_by",)
    action_role_map = {
        "list": REAL_ESTATE_READ_ROLES,
        "retrieve": REAL_ESTATE_READ_ROLES,
        "create": REAL_ESTATE_WRITE_ROLES,
        "update": REAL_ESTATE_WRITE_ROLES,
        "partial_update": REAL_ESTATE_WRITE_ROLES,
        "destroy": {ROLE_ADMIN},
    }
    filterset_fields = ["status", "currency", "created_by"]
    search_fields = ["code", "name", "location"]
    ordering_fields = ["created_at", "code", "name"]

    def get_queryset(self):
        return self.apply_row_level_scope(super().get_queryset())

    def perform_create(self, serializer):
        instance = serializer.save(created_by=self.request.user)
        self.log_action(action="create", instance=instance, changes=serializer.validated_data)


class BuildingViewSet(AuditLogMixin, RowLevelScopeMixin, viewsets.ModelViewSet):
    queryset = Building.objects.select_related("project").all()
    serializer_class = BuildingSerializer
    permission_classes = [ActionBasedRolePermission]
    user_scope_fields = ("project__created_by",)
    action_role_map = {
        "list": REAL_ESTATE_READ_ROLES,
        "retrieve": REAL_ESTATE_READ_ROLES,
        "create": REAL_ESTATE_WRITE_ROLES,
        "update": REAL_ESTATE_WRITE_ROLES,
        "partial_update": REAL_ESTATE_WRITE_ROLES,
        "destroy": {ROLE_ADMIN},
    }
    filterset_fields = ["project"]
    search_fields = ["code", "name", "project__code"]
    ordering_fields = ["project", "code", "created_at"]

    def get_queryset(self):
        return self.apply_row_level_scope(super().get_queryset())


class UnitTypeViewSet(AuditLogMixin, RowLevelScopeMixin, viewsets.ModelViewSet):
    queryset = UnitType.objects.select_related("project").all()
    serializer_class = UnitTypeSerializer
    permission_classes = [ActionBasedRolePermission]
    user_scope_fields = ("project__created_by",)
    action_role_map = {
        "list": REAL_ESTATE_READ_ROLES,
        "retrieve": REAL_ESTATE_READ_ROLES,
        "create": REAL_ESTATE_WRITE_ROLES,
        "update": REAL_ESTATE_WRITE_ROLES,
        "partial_update": REAL_ESTATE_WRITE_ROLES,
        "destroy": {ROLE_ADMIN},
    }
    filterset_fields = ["project"]
    search_fields = ["code", "name", "project__code"]
    ordering_fields = ["project", "code", "created_at"]

    def get_queryset(self):
        return self.apply_row_level_scope(super().get_queryset())


class UnitViewSet(AuditLogMixin, RowLevelScopeMixin, viewsets.ModelViewSet):
    queryset = Unit.objects.select_related("building", "unit_type").all()
    serializer_class = UnitSerializer
    permission_classes = [ActionBasedRolePermission]
    user_scope_fields = ("building__project__created_by",)
    action_role_map = {
        "list": REAL_ESTATE_READ_ROLES,
        "retrieve": REAL_ESTATE_READ_ROLES,
        "create": REAL_ESTATE_WRITE_ROLES,
        "update": REAL_ESTATE_WRITE_ROLES,
        "partial_update": REAL_ESTATE_WRITE_ROLES,
        "destroy": {ROLE_ADMIN},
    }
    filterset_fields = ["building", "unit_type", "status", "is_active"]
    search_fields = ["code", "building__code"]
    ordering_fields = ["building", "code", "created_at"]

    def get_queryset(self):
        return self.apply_row_level_scope(super().get_queryset())


class UnitPricingViewSet(AuditLogMixin, RowLevelScopeMixin, viewsets.ModelViewSet):
    queryset = UnitPricing.objects.select_related("unit").all()
    serializer_class = UnitPricingSerializer
    permission_classes = [ActionBasedRolePermission]
    user_scope_fields = ("unit__building__project__created_by",)
    action_role_map = {
        "list": REAL_ESTATE_READ_ROLES,
        "retrieve": REAL_ESTATE_READ_ROLES,
        "create": REAL_ESTATE_SALES_ROLES,
        "update": REAL_ESTATE_SALES_ROLES,
        "partial_update": REAL_ESTATE_SALES_ROLES,
        "destroy": {ROLE_ADMIN},
        "reserve": REAL_ESTATE_SALES_ROLES,
        "cancel": REAL_ESTATE_SALES_ROLES,
    }
    filterset_fields = ["unit", "currency", "is_active"]
    search_fields = ["unit__code"]
    ordering_fields = ["effective_date", "created_at"]

    def get_queryset(self):
        return self.apply_row_level_scope(super().get_queryset())


class ReservationViewSet(AuditLogMixin, RowLevelScopeMixin, viewsets.ModelViewSet):
    queryset = Reservation.objects.select_related(
        "unit",
        "unit__building",
        "unit__building__project",
        "unit__unit_type",
        "customer",
        "created_by",
    ).all()
    serializer_class = ReservationSerializer
    permission_classes = [ActionBasedRolePermission]
    user_scope_fields = ("created_by", "customer__user", "unit__building__project__created_by")
    action_role_map = {
        "list": REAL_ESTATE_READ_ROLES,
        "retrieve": REAL_ESTATE_READ_ROLES,
        "create": REAL_ESTATE_SALES_ROLES,
        "update": REAL_ESTATE_SALES_ROLES,
        "partial_update": REAL_ESTATE_SALES_ROLES,
        "destroy": {ROLE_ADMIN},
        "handover": REAL_ESTATE_SALES_ROLES,
    }
    filterset_fields = ["status", "unit", "customer"]
    search_fields = ["reservation_number", "unit__code", "customer__name"]
    ordering_fields = ["created_at", "reserved_at"]

    def get_queryset(self):
        return self.apply_row_level_scope(super().get_queryset())

    def perform_create(self, serializer):
        unit = serializer.validated_data.get("unit")
        if unit.status != Unit.Status.AVAILABLE:
            raise ValidationError({"unit": "Unit must be available to reserve."})
        instance = serializer.save(created_by=self.request.user)
        self.log_action(action="create", instance=instance, changes=serializer.validated_data)

    @action(detail=True, methods=["post"])
    def reserve(self, request, pk=None):
        reservation = self.get_object()
        if reservation.status != Reservation.Status.DRAFT:
            raise ValidationError({"status": "Only draft reservations can be reserved."})
        if reservation.unit.status != Unit.Status.AVAILABLE:
            raise ValidationError({"unit": "Unit is not available."})
        reservation.status = Reservation.Status.RESERVED
        reservation.reserved_at = timezone.now()
        reservation.save(update_fields=["status", "reserved_at", "updated_at"])
        reservation.unit.status = Unit.Status.RESERVED
        reservation.unit.save(update_fields=["status", "updated_at"])
        return Response(self.get_serializer(reservation).data)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        reservation = self.get_object()
        if reservation.status not in {Reservation.Status.DRAFT, Reservation.Status.RESERVED}:
            raise ValidationError({"status": "Reservation cannot be cancelled in its current status."})
        reservation.status = Reservation.Status.CANCELLED
        reservation.save(update_fields=["status", "updated_at"])
        if reservation.unit.status == Unit.Status.RESERVED:
            reservation.unit.status = Unit.Status.AVAILABLE
            reservation.unit.save(update_fields=["status", "updated_at"])
        return Response(self.get_serializer(reservation).data)


class SalesContractViewSet(AuditLogMixin, RowLevelScopeMixin, viewsets.ModelViewSet):
    queryset = SalesContract.objects.select_related(
        "unit",
        "unit__building",
        "unit__building__project",
        "unit__unit_type",
        "customer",
        "reservation",
        "created_by",
    ).all()
    serializer_class = SalesContractSerializer
    permission_classes = [ActionBasedRolePermission]
    user_scope_fields = ("created_by", "customer__user", "unit__building__project__created_by")
    action_role_map = {
        "list": REAL_ESTATE_READ_ROLES,
        "retrieve": REAL_ESTATE_READ_ROLES,
        "create": REAL_ESTATE_SALES_ROLES,
        "update": REAL_ESTATE_SALES_ROLES,
        "partial_update": REAL_ESTATE_SALES_ROLES,
        "destroy": {ROLE_ADMIN},
    }
    filterset_fields = ["status", "unit", "customer", "contract_date"]
    search_fields = ["contract_number", "unit__code", "customer__name"]
    ordering_fields = ["contract_date", "created_at"]

    def get_queryset(self):
        return self.apply_row_level_scope(super().get_queryset())

    def perform_create(self, serializer):
        unit = serializer.validated_data.get("unit")
        if unit.status not in {Unit.Status.AVAILABLE, Unit.Status.RESERVED}:
            raise ValidationError({"unit": "Unit is not available for sale."})
        instance = serializer.save(created_by=self.request.user)
        if instance.reservation and instance.reservation.status != Reservation.Status.CONVERTED:
            instance.reservation.status = Reservation.Status.CONVERTED
            instance.reservation.save(update_fields=["status", "updated_at"])
        unit.status = Unit.Status.SOLD
        unit.save(update_fields=["status", "updated_at"])
        self.log_action(action="create", instance=instance, changes=serializer.validated_data)


class PaymentScheduleViewSet(AuditLogMixin, RowLevelScopeMixin, viewsets.ModelViewSet):
    queryset = PaymentSchedule.objects.select_related("contract").all()
    serializer_class = PaymentScheduleSerializer
    permission_classes = [ActionBasedRolePermission]
    user_scope_fields = ("contract__created_by", "contract__customer__user")
    action_role_map = {
        "list": REAL_ESTATE_READ_ROLES,
        "retrieve": REAL_ESTATE_READ_ROLES,
        "create": REAL_ESTATE_SALES_ROLES,
        "update": REAL_ESTATE_SALES_ROLES,
        "partial_update": REAL_ESTATE_SALES_ROLES,
        "destroy": {ROLE_ADMIN},
    }
    filterset_fields = ["contract"]
    search_fields = ["contract__contract_number"]
    ordering_fields = ["created_at", "start_date"]

    def get_queryset(self):
        return self.apply_row_level_scope(super().get_queryset())


class InstallmentViewSet(AuditLogMixin, RowLevelScopeMixin, viewsets.ModelViewSet):
    queryset = Installment.objects.select_related(
        "schedule",
        "schedule__contract",
        "schedule__contract__unit",
        "schedule__contract__unit__building",
        "schedule__contract__unit__building__project",
        "schedule__contract__unit__unit_type",
    ).all()
    serializer_class = InstallmentSerializer
    permission_classes = [ActionBasedRolePermission]
    user_scope_fields = ("schedule__contract__created_by", "schedule__contract__customer__user")
    action_role_map = {
        "list": REAL_ESTATE_READ_ROLES,
        "retrieve": REAL_ESTATE_READ_ROLES,
        "create": REAL_ESTATE_SALES_ROLES,
        "update": REAL_ESTATE_SALES_ROLES,
        "partial_update": REAL_ESTATE_SALES_ROLES,
        "destroy": {ROLE_ADMIN},
    }
    filterset_fields = ["schedule", "status", "due_date"]
    search_fields = ["installment_number", "schedule__contract__contract_number"]
    ordering_fields = ["due_date", "created_at"]

    def get_queryset(self):
        return self.apply_row_level_scope(super().get_queryset())


class HandoverViewSet(AuditLogMixin, RowLevelScopeMixin, viewsets.ModelViewSet):
    queryset = Handover.objects.select_related(
        "contract",
        "contract__unit",
        "contract__unit__building",
        "contract__unit__building__project",
        "contract__unit__unit_type",
    ).all()
    serializer_class = HandoverSerializer
    permission_classes = [ActionBasedRolePermission]
    user_scope_fields = ("contract__created_by", "contract__customer__user")
    action_role_map = {
        "list": REAL_ESTATE_READ_ROLES,
        "retrieve": REAL_ESTATE_READ_ROLES,
        "create": REAL_ESTATE_SALES_ROLES,
        "update": REAL_ESTATE_SALES_ROLES,
        "partial_update": REAL_ESTATE_SALES_ROLES,
        "destroy": {ROLE_ADMIN},
    }
    filterset_fields = ["status", "handover_date"]
    search_fields = ["contract__contract_number"]
    ordering_fields = ["handover_date", "created_at"]

    def get_queryset(self):
        return self.apply_row_level_scope(super().get_queryset())

    @action(detail=True, methods=["post"])
    def handover(self, request, pk=None):
        handover = self.get_object()
        if handover.status == Handover.Status.HANDED_OVER:
            return Response(self.get_serializer(handover).data)
        handover.status = Handover.Status.HANDED_OVER
        handover.handover_date = handover.handover_date or timezone.localdate()
        handover.save(update_fields=["status", "handover_date", "updated_at"])
        unit = handover.contract.unit
        if unit.status != Unit.Status.HANDED_OVER:
            unit.status = Unit.Status.HANDED_OVER
            unit.save(update_fields=["status", "updated_at"])
        return Response(self.get_serializer(handover).data)


class CustomerContractViewSet(RowLevelScopeMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    queryset = SalesContract.objects.select_related(
        "unit",
        "unit__building",
        "unit__building__project",
        "unit__unit_type",
        "customer",
    ).all()
    serializer_class = SalesContractSerializer
    permission_classes = [IsAuthenticated]
    user_scope_fields = ("customer__user",)
    global_scope_role_slugs = ()
    filterset_fields = ["status", "contract_date"]
    search_fields = ["contract_number", "unit__code"]
    ordering_fields = ["contract_date", "created_at"]

    def get_queryset(self):
        return self.apply_row_level_scope(super().get_queryset())

    @action(detail=True, methods=["get"])
    def installments(self, request, pk=None):
        contract = self.get_object()
        installments = (
            Installment.objects.select_related(
                "schedule",
                "schedule__contract",
                "schedule__contract__unit",
                "schedule__contract__unit__building",
                "schedule__contract__unit__building__project",
                "schedule__contract__unit__unit_type",
            )
            .filter(schedule__contract=contract)
            .order_by("due_date", "installment_number")
        )
        serializer = InstallmentSerializer(installments, many=True)
        return Response(serializer.data)


class CustomerInstallmentViewSet(RowLevelScopeMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    queryset = Installment.objects.select_related(
        "schedule",
        "schedule__contract",
        "schedule__contract__unit",
        "schedule__contract__unit__building",
        "schedule__contract__unit__building__project",
        "schedule__contract__unit__unit_type",
    ).all()
    serializer_class = InstallmentSerializer
    permission_classes = [IsAuthenticated]
    user_scope_fields = ("schedule__contract__customer__user",)
    global_scope_role_slugs = ()
    filterset_fields = ["status", "due_date"]
    search_fields = ["installment_number", "schedule__contract__contract_number"]
    ordering_fields = ["due_date", "created_at"]

    def get_queryset(self):
        return self.apply_row_level_scope(super().get_queryset())

    @action(detail=True, methods=["get"])
    def payments(self, request, pk=None):
        installment = self.get_object()
        allocations = (
            PaymentAllocation.objects.select_related("payment", "invoice", "installment")
            .filter(installment=installment)
            .order_by("-created_at")
        )
        serializer = PaymentAllocationDetailSerializer(allocations, many=True)
        return Response(serializer.data)


class CustomerReservationViewSet(RowLevelScopeMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    queryset = Reservation.objects.select_related(
        "unit",
        "unit__building",
        "unit__building__project",
        "unit__unit_type",
        "customer",
    ).all()
    serializer_class = ReservationSerializer
    permission_classes = [IsAuthenticated]
    user_scope_fields = ("customer__user",)
    global_scope_role_slugs = ()
    filterset_fields = ["status", "reserved_at"]
    search_fields = ["reservation_number", "unit__code"]
    ordering_fields = ["reserved_at", "created_at"]

    def get_queryset(self):
        return self.apply_row_level_scope(super().get_queryset())


class CustomerHandoverViewSet(RowLevelScopeMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    queryset = Handover.objects.select_related(
        "contract",
        "contract__customer",
        "contract__unit",
        "contract__unit__building",
        "contract__unit__building__project",
        "contract__unit__unit_type",
    ).all()
    serializer_class = HandoverSerializer
    permission_classes = [IsAuthenticated]
    user_scope_fields = ("contract__customer__user",)
    global_scope_role_slugs = ()
    filterset_fields = ["status", "handover_date"]
    search_fields = ["contract__contract_number", "contract__unit__code"]
    ordering_fields = ["handover_date", "created_at"]

    def get_queryset(self):
        return self.apply_row_level_scope(super().get_queryset())
