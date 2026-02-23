from django.contrib import admin

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


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "phone", "is_active")
    search_fields = ("code", "name", "tax_number")
    list_filter = ("is_active",)


@admin.register(Warehouse)
class WarehouseAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "location", "is_active")
    search_fields = ("code", "name", "location")
    list_filter = ("is_active",)


@admin.register(Material)
class MaterialAdmin(admin.ModelAdmin):
    list_display = ("sku", "name", "unit", "reorder_level", "preferred_supplier")
    search_fields = ("sku", "name")
    list_filter = ("preferred_supplier",)


class PurchaseRequestItemInline(admin.TabularInline):
    model = PurchaseRequestItem
    extra = 0


@admin.register(PurchaseRequest)
class PurchaseRequestAdmin(admin.ModelAdmin):
    list_display = ("request_number", "project", "status", "needed_by", "requested_by")
    search_fields = ("request_number", "project__code")
    list_filter = ("status", "needed_by")
    inlines = [PurchaseRequestItemInline]


class PurchaseOrderItemInline(admin.TabularInline):
    model = PurchaseOrderItem
    extra = 0


@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(admin.ModelAdmin):
    list_display = ("order_number", "supplier", "project", "status", "order_date", "total_amount")
    search_fields = ("order_number", "supplier__name", "project__code")
    list_filter = ("status", "order_date")
    inlines = [PurchaseOrderItemInline]


@admin.register(StockTransaction)
class StockTransactionAdmin(admin.ModelAdmin):
    list_display = ("material", "warehouse", "transaction_type", "quantity", "transaction_date")
    search_fields = ("material__sku", "warehouse__code", "reference_id")
    list_filter = ("transaction_type", "transaction_date")
