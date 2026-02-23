from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    MaterialViewSet,
    PurchaseOrderViewSet,
    PurchaseRequestViewSet,
    StockTransactionViewSet,
    SupplierViewSet,
    WarehouseViewSet,
)

router = DefaultRouter()
router.register("suppliers", SupplierViewSet, basename="supplier")
router.register("warehouses", WarehouseViewSet, basename="warehouse")
router.register("materials", MaterialViewSet, basename="material")
router.register("purchase-requests", PurchaseRequestViewSet, basename="purchase-request")
router.register("purchase-orders", PurchaseOrderViewSet, basename="purchase-order")
router.register("stock-transactions", StockTransactionViewSet, basename="stock-transaction")

urlpatterns = [
    path("", include(router.urls)),
]
