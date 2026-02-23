from django.contrib import admin

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


@admin.register(RealEstateProject)
class RealEstateProjectAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "status", "currency", "created_at")
    search_fields = ("code", "name", "location")
    list_filter = ("status", "currency")


@admin.register(Building)
class BuildingAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "project", "floors")
    search_fields = ("code", "name", "project__code")


@admin.register(UnitType)
class UnitTypeAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "project", "base_price")
    search_fields = ("code", "name", "project__code")


@admin.register(Unit)
class UnitAdmin(admin.ModelAdmin):
    list_display = ("code", "building", "unit_type", "status", "is_active")
    search_fields = ("code", "building__code")
    list_filter = ("status", "is_active")


@admin.register(UnitPricing)
class UnitPricingAdmin(admin.ModelAdmin):
    list_display = ("unit", "price", "currency", "effective_date", "is_active")
    list_filter = ("currency", "is_active")


@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = ("reservation_number", "unit", "customer", "status", "reserved_at")
    search_fields = ("reservation_number", "unit__code", "customer__name")
    list_filter = ("status",)


@admin.register(SalesContract)
class SalesContractAdmin(admin.ModelAdmin):
    list_display = ("contract_number", "unit", "customer", "status", "contract_date")
    search_fields = ("contract_number", "unit__code", "customer__name")
    list_filter = ("status",)


@admin.register(PaymentSchedule)
class PaymentScheduleAdmin(admin.ModelAdmin):
    list_display = ("contract", "name", "total_amount", "start_date", "end_date")


@admin.register(Installment)
class InstallmentAdmin(admin.ModelAdmin):
    list_display = ("installment_number", "schedule", "due_date", "amount", "status")
    list_filter = ("status",)


@admin.register(Handover)
class HandoverAdmin(admin.ModelAdmin):
    list_display = ("contract", "status", "handover_date")
    list_filter = ("status",)
