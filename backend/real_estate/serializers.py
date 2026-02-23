from decimal import Decimal

from rest_framework import serializers

from core.services.sequence import next_sequence
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


class RealEstateProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = RealEstateProject
        fields = [
            "id",
            "code",
            "name",
            "description",
            "location",
            "status",
            "currency",
            "start_date",
            "expected_end_date",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_by", "created_at", "updated_at"]
        extra_kwargs = {"code": {"required": False, "allow_blank": True}}

    def create(self, validated_data):
        if not validated_data.get("code"):
            validated_data["code"] = next_sequence("real_estate_project")
        return RealEstateProject.objects.create(**validated_data)


class BuildingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Building
        fields = [
            "id",
            "project",
            "code",
            "name",
            "floors",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class UnitTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = UnitType
        fields = [
            "id",
            "project",
            "code",
            "name",
            "bedrooms",
            "bathrooms",
            "area_sqm",
            "base_price",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class UnitSerializer(serializers.ModelSerializer):
    class Meta:
        model = Unit
        fields = [
            "id",
            "building",
            "unit_type",
            "code",
            "floor",
            "area_sqm",
            "status",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class UnitPricingSerializer(serializers.ModelSerializer):
    class Meta:
        model = UnitPricing
        fields = [
            "id",
            "unit",
            "price",
            "currency",
            "effective_date",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class ReservationSerializer(serializers.ModelSerializer):
    unit_code = serializers.CharField(source="unit.code", read_only=True)
    unit_building_code = serializers.CharField(source="unit.building.code", read_only=True)
    building_name = serializers.CharField(source="unit.building.name", read_only=True, allow_null=True)
    project_name = serializers.CharField(source="unit.building.project.name", read_only=True, allow_null=True)
    project_code = serializers.CharField(source="unit.building.project.code", read_only=True)
    unit_floor = serializers.IntegerField(source="unit.floor", read_only=True)
    unit_area_sqm = serializers.DecimalField(
        source="unit.area_sqm",
        max_digits=10,
        decimal_places=2,
        read_only=True,
    )
    unit_type_name = serializers.CharField(source="unit.unit_type.name", read_only=True, allow_null=True)
    customer_name = serializers.CharField(source="customer.name", read_only=True)

    class Meta:
        model = Reservation
        fields = [
            "id",
            "reservation_number",
            "unit",
            "unit_code",
            "unit_building_code",
            "building_name",
            "project_name",
            "project_code",
            "unit_floor",
            "unit_area_sqm",
            "unit_type_name",
            "customer",
            "customer_name",
            "status",
            "reserved_at",
            "expires_at",
            "notes",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_by", "created_at", "updated_at"]
        extra_kwargs = {"reservation_number": {"required": False, "allow_blank": True}}

    def create(self, validated_data):
        if not validated_data.get("reservation_number"):
            validated_data["reservation_number"] = next_sequence("reservation")
        return Reservation.objects.create(**validated_data)


class SalesContractSerializer(serializers.ModelSerializer):
    unit_code = serializers.CharField(source="unit.code", read_only=True)
    unit_building_code = serializers.CharField(source="unit.building.code", read_only=True)
    building_name = serializers.CharField(source="unit.building.name", read_only=True, allow_null=True)
    project_name = serializers.CharField(source="unit.building.project.name", read_only=True, allow_null=True)
    project_code = serializers.CharField(source="unit.building.project.code", read_only=True)
    unit_floor = serializers.IntegerField(source="unit.floor", read_only=True)
    unit_area_sqm = serializers.DecimalField(
        source="unit.area_sqm",
        max_digits=10,
        decimal_places=2,
        read_only=True,
    )
    unit_type_name = serializers.CharField(source="unit.unit_type.name", read_only=True, allow_null=True)
    customer_name = serializers.CharField(source="customer.name", read_only=True)

    class Meta:
        model = SalesContract
        fields = [
            "id",
            "contract_number",
            "unit",
            "unit_code",
            "unit_building_code",
            "building_name",
            "project_name",
            "project_code",
            "unit_floor",
            "unit_area_sqm",
            "unit_type_name",
            "customer",
            "customer_name",
            "reservation",
            "status",
            "contract_date",
            "total_price",
            "down_payment",
            "currency",
            "signed_by",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_by", "created_at", "updated_at"]
        extra_kwargs = {"contract_number": {"required": False, "allow_blank": True}}

    def validate(self, attrs):
        unit = attrs.get("unit") or getattr(self.instance, "unit", None)
        if unit and unit.status in {unit.Status.SOLD, unit.Status.HANDED_OVER}:
            raise serializers.ValidationError({"unit": "Unit is already sold or handed over."})
        return attrs

    def create(self, validated_data):
        if not validated_data.get("contract_number"):
            validated_data["contract_number"] = next_sequence("sales_contract")
        return SalesContract.objects.create(**validated_data)


class PaymentScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentSchedule
        fields = [
            "id",
            "contract",
            "name",
            "total_amount",
            "start_date",
            "end_date",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class InstallmentSerializer(serializers.ModelSerializer):
    contract_number = serializers.CharField(source="schedule.contract.contract_number", read_only=True)
    unit_code = serializers.CharField(source="schedule.contract.unit.code", read_only=True)
    unit_building_code = serializers.CharField(source="schedule.contract.unit.building.code", read_only=True)
    building_name = serializers.CharField(source="schedule.contract.unit.building.name", read_only=True, allow_null=True)
    project_name = serializers.CharField(source="schedule.contract.unit.building.project.name", read_only=True, allow_null=True)
    project_code = serializers.CharField(source="schedule.contract.unit.building.project.code", read_only=True)
    unit_floor = serializers.IntegerField(source="schedule.contract.unit.floor", read_only=True)
    unit_area_sqm = serializers.DecimalField(
        source="schedule.contract.unit.area_sqm",
        max_digits=10,
        decimal_places=2,
        read_only=True,
    )
    unit_type_name = serializers.CharField(source="schedule.contract.unit.unit_type.name", read_only=True, allow_null=True)
    currency = serializers.CharField(source="schedule.contract.currency", read_only=True)

    class Meta:
        model = Installment
        fields = [
            "id",
            "schedule",
            "installment_number",
            "contract_number",
            "unit_code",
            "unit_building_code",
            "building_name",
            "project_name",
            "project_code",
            "unit_floor",
            "unit_area_sqm",
            "unit_type_name",
            "due_date",
            "amount",
            "currency",
            "status",
            "paid_amount",
            "paid_at",
            "linked_invoice",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]
        extra_kwargs = {"installment_number": {"required": False, "allow_blank": True}}

    def create(self, validated_data):
        if not validated_data.get("installment_number"):
            validated_data["installment_number"] = next_sequence("installment")
        return Installment.objects.create(**validated_data)

    def validate(self, attrs):
        amount = attrs.get("amount") or getattr(self.instance, "amount", None)
        if amount is not None and amount <= Decimal("0.00"):
            raise serializers.ValidationError({"amount": "Installment amount must be greater than zero."})
        return attrs


class HandoverSerializer(serializers.ModelSerializer):
    contract_number = serializers.CharField(source="contract.contract_number", read_only=True)
    unit_code = serializers.CharField(source="contract.unit.code", read_only=True)
    unit_building_code = serializers.CharField(source="contract.unit.building.code", read_only=True)
    building_name = serializers.CharField(source="contract.unit.building.name", read_only=True, allow_null=True)
    project_name = serializers.CharField(source="contract.unit.building.project.name", read_only=True, allow_null=True)
    project_code = serializers.CharField(source="contract.unit.building.project.code", read_only=True)
    unit_floor = serializers.IntegerField(source="contract.unit.floor", read_only=True)
    unit_area_sqm = serializers.DecimalField(
        source="contract.unit.area_sqm",
        max_digits=10,
        decimal_places=2,
        read_only=True,
    )
    unit_type_name = serializers.CharField(source="contract.unit.unit_type.name", read_only=True, allow_null=True)

    class Meta:
        model = Handover
        fields = [
            "id",
            "contract",
            "contract_number",
            "unit_code",
            "unit_building_code",
            "building_name",
            "project_name",
            "project_code",
            "unit_floor",
            "unit_area_sqm",
            "unit_type_name",
            "status",
            "handover_date",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]
