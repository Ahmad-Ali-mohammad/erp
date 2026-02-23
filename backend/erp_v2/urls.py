from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    BankReconciliationSessionViewSet,
    BankStatementViewSet,
    CostCenterViewSet,
    GLAccountViewSet,
    GLEntryViewSet,
    InventoryAdjustmentViewSet,
    InventoryCountSessionViewSet,
    InventoryLocationViewSet,
    InventoryMovementViewSet,
    MasterCustomerViewSet,
    MasterItemViewSet,
    MasterVendorViewSet,
    POSCheckoutView,
    PostingRuleViewSet,
    PurchaseInvoiceViewSet,
    PurchaseOrderViewSet,
    PurchaseReceiptViewSet,
    ReportsViewSet,
    SalesInvoiceViewSet,
    SalesOrderViewSet,
    SalesQuotationViewSet,
    TreasuryChequeViewSet,
    TreasuryPaymentViewSet,
    TreasuryReceiptViewSet,
    health_view,
)

router = DefaultRouter()
router.register("finance/accounts", GLAccountViewSet, basename="erp-v2-account")
router.register("finance/cost-centers", CostCenterViewSet, basename="erp-v2-cost-center")
router.register("finance/posting-rules", PostingRuleViewSet, basename="erp-v2-posting-rule")
router.register("masters/customers", MasterCustomerViewSet, basename="erp-v2-customer")
router.register("masters/vendors", MasterVendorViewSet, basename="erp-v2-vendor")
router.register("masters/items", MasterItemViewSet, basename="erp-v2-item")
router.register("inventory/locations", InventoryLocationViewSet, basename="erp-v2-location")
router.register("inventory/movements", InventoryMovementViewSet, basename="erp-v2-movement")
router.register("inventory/adjustments", InventoryAdjustmentViewSet, basename="erp-v2-adjustment")
router.register("inventory/count-sessions", InventoryCountSessionViewSet, basename="erp-v2-count-session")
router.register("sales/quotations", SalesQuotationViewSet, basename="erp-v2-quotation")
router.register("sales/orders", SalesOrderViewSet, basename="erp-v2-order")
router.register("sales/invoices", SalesInvoiceViewSet, basename="erp-v2-sales-invoice")
router.register("purchase/orders", PurchaseOrderViewSet, basename="erp-v2-purchase-order")
router.register("purchase/receipts", PurchaseReceiptViewSet, basename="erp-v2-purchase-receipt")
router.register("purchase/invoices", PurchaseInvoiceViewSet, basename="erp-v2-purchase-invoice")
router.register("treasury/receipts", TreasuryReceiptViewSet, basename="erp-v2-treasury-receipt")
router.register("treasury/payments", TreasuryPaymentViewSet, basename="erp-v2-treasury-payment")
router.register("treasury/cheques", TreasuryChequeViewSet, basename="erp-v2-treasury-cheque")
router.register("banking/statements", BankStatementViewSet, basename="erp-v2-bank-statement")
router.register("banking/reconciliations", BankReconciliationSessionViewSet, basename="erp-v2-reconciliation")
router.register("gl/journal-entries", GLEntryViewSet, basename="erp-v2-gl-entry")
router.register("reports", ReportsViewSet, basename="erp-v2-report")

urlpatterns = [
    path("health/", health_view, name="erp-v2-health"),
    path("sales/pos/checkout/", POSCheckoutView.as_view(), name="erp-v2-pos-checkout"),
    path("", include(router.urls)),
]
