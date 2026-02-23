from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AccountViewSet,
    BankAccountViewSet,
    BankReconciliationSessionViewSet,
    BankStatementViewSet,
    CustomerInvoiceViewSet,
    CustomerPaymentViewSet,
    ExchangeRateViewSet,
    FinanceReportsViewSet,
    FiscalPeriodViewSet,
    InvoiceViewSet,
    JournalEntryViewSet,
    PaymentViewSet,
    PostingRuleViewSet,
    ProgressBillingViewSet,
    PrintSettingsViewSet,
    RecurringEntryTemplateViewSet,
    RevenueRecognitionEntryViewSet,
    YearCloseViewSet,
)

router = DefaultRouter()
router.register("accounts", AccountViewSet, basename="account")
router.register("journal-entries", JournalEntryViewSet, basename="journal-entry")
router.register("invoices", InvoiceViewSet, basename="invoice")
router.register("payments", PaymentViewSet, basename="payment")
router.register("progress-billings", ProgressBillingViewSet, basename="progress-billing")
router.register("revenue-recognition", RevenueRecognitionEntryViewSet, basename="revenue-recognition")
router.register("periods", FiscalPeriodViewSet, basename="period")
router.register("exchange-rates", ExchangeRateViewSet, basename="exchange-rate")
router.register("print-settings", PrintSettingsViewSet, basename="print-settings")
router.register("posting-rules", PostingRuleViewSet, basename="posting-rule")
router.register("recurring-templates", RecurringEntryTemplateViewSet, basename="recurring-template")
router.register("bank-accounts", BankAccountViewSet, basename="bank-account")
router.register("bank-statements", BankStatementViewSet, basename="bank-statement")
router.register("bank-reconciliation-sessions", BankReconciliationSessionViewSet, basename="bank-reconciliation-session")
router.register("reports", FinanceReportsViewSet, basename="finance-report")
router.register("year-close", YearCloseViewSet, basename="year-close")

portal_router = DefaultRouter()
portal_router.register("invoices", CustomerInvoiceViewSet, basename="portal-invoice")
portal_router.register("payments", CustomerPaymentViewSet, basename="portal-payment")

urlpatterns = [
    path("portal/", include(portal_router.urls)),
    path(
        "print-settings/",
        PrintSettingsViewSet.as_view({"get": "list", "patch": "update"}),
        name="print-settings",
    ),
    path("", include(router.urls)),
]
