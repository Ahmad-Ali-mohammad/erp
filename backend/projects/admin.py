from django.contrib import admin

from .models import (
    BoQItem,
    Project,
    ProjectPhase,
    Subcontract,
    SubcontractPayment,
    Subcontractor,
)


class ProjectPhaseInline(admin.TabularInline):
    model = ProjectPhase
    extra = 0


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "client_name", "status", "budget", "contract_value")
    list_filter = ("status", "currency")
    search_fields = ("code", "name", "client_name")
    inlines = [ProjectPhaseInline]


@admin.register(ProjectPhase)
class ProjectPhaseAdmin(admin.ModelAdmin):
    list_display = ("project", "name", "sequence", "planned_progress", "actual_progress")
    list_filter = ("project",)
    search_fields = ("project__code", "name")


@admin.register(BoQItem)
class BoQItemAdmin(admin.ModelAdmin):
    list_display = ("project", "item_code", "unit", "planned_quantity", "planned_unit_cost")
    list_filter = ("project",)
    search_fields = ("project__code", "item_code", "description")


@admin.register(Subcontractor)
class SubcontractorAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "tax_number", "is_active")
    search_fields = ("code", "name", "tax_number")
    list_filter = ("is_active",)


@admin.register(Subcontract)
class SubcontractAdmin(admin.ModelAdmin):
    list_display = ("contract_number", "project", "subcontractor", "status", "contract_value")
    list_filter = ("status", "project")
    search_fields = ("contract_number", "project__code", "subcontractor__name")


@admin.register(SubcontractPayment)
class SubcontractPaymentAdmin(admin.ModelAdmin):
    list_display = ("subcontract", "payment_date", "amount", "status")
    list_filter = ("status",)
