from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    BuildingViewSet,
    CustomerContractViewSet,
    CustomerHandoverViewSet,
    CustomerInstallmentViewSet,
    CustomerReservationViewSet,
    HandoverViewSet,
    InstallmentViewSet,
    PaymentScheduleViewSet,
    RealEstateProjectViewSet,
    ReservationViewSet,
    SalesContractViewSet,
    UnitPricingViewSet,
    UnitTypeViewSet,
    UnitViewSet,
)

router = DefaultRouter()
router.register("projects", RealEstateProjectViewSet, basename="real-estate-project")
router.register("buildings", BuildingViewSet, basename="real-estate-building")
router.register("unit-types", UnitTypeViewSet, basename="real-estate-unit-type")
router.register("units", UnitViewSet, basename="real-estate-unit")
router.register("unit-pricing", UnitPricingViewSet, basename="real-estate-unit-pricing")
router.register("reservations", ReservationViewSet, basename="real-estate-reservation")
router.register("sales-contracts", SalesContractViewSet, basename="real-estate-sales-contract")
router.register("payment-schedules", PaymentScheduleViewSet, basename="real-estate-payment-schedule")
router.register("installments", InstallmentViewSet, basename="real-estate-installment")
router.register("handovers", HandoverViewSet, basename="real-estate-handover")

portal_router = DefaultRouter()
portal_router.register("contracts", CustomerContractViewSet, basename="real-estate-portal-contract")
portal_router.register("installments", CustomerInstallmentViewSet, basename="real-estate-portal-installment")
portal_router.register("reservations", CustomerReservationViewSet, basename="real-estate-portal-reservation")
portal_router.register("handovers", CustomerHandoverViewSet, basename="real-estate-portal-handover")

urlpatterns = [
    path("portal/", include(portal_router.urls)),
    path("", include(router.urls)),
]
