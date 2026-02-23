from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AuditLogViewSet,
    CompanyProfileViewSet,
    CustomerViewSet,
    DocumentViewSet,
    HealthCheckView,
    RoleViewSet,
    SequenceViewSet,
    UserViewSet,
)

router = DefaultRouter()
router.register("roles", RoleViewSet, basename="role")
router.register("users", UserViewSet, basename="user")
router.register("audit-logs", AuditLogViewSet, basename="audit-log")
router.register("customers", CustomerViewSet, basename="customer")
router.register("sequences", SequenceViewSet, basename="sequence")
router.register("documents", DocumentViewSet, basename="document")

urlpatterns = [
    path("health/", HealthCheckView.as_view(), name="health"),
    path(
        "company-profile/",
        CompanyProfileViewSet.as_view({"get": "list", "patch": "update"}),
        name="company-profile",
    ),
    path("", include(router.urls)),
]
