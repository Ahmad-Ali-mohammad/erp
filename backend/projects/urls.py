from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    BoQItemViewSet,
    ChangeOrderViewSet,
    CostCodeViewSet,
    ProjectBudgetLineViewSet,
    ProjectCostRecordViewSet,
    ProjectPhaseViewSet,
    ProjectViewSet,
    SubcontractPaymentViewSet,
    SubcontractViewSet,
    SubcontractorViewSet,
)

router = DefaultRouter()
router.register("projects", ProjectViewSet, basename="project")
router.register("phases", ProjectPhaseViewSet, basename="phase")
router.register("boq-items", BoQItemViewSet, basename="boq-item")
router.register("cost-codes", CostCodeViewSet, basename="cost-code")
router.register("budget-lines", ProjectBudgetLineViewSet, basename="budget-line")
router.register("cost-records", ProjectCostRecordViewSet, basename="cost-record")
router.register("change-orders", ChangeOrderViewSet, basename="change-order")
router.register("subcontractors", SubcontractorViewSet, basename="subcontractor")
router.register("subcontracts", SubcontractViewSet, basename="subcontract")
router.register("subcontract-payments", SubcontractPaymentViewSet, basename="subcontract-payment")

urlpatterns = [
    path("", include(router.urls)),
]
