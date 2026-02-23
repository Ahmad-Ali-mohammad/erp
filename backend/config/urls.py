from django.contrib import admin
from django.urls import include, path
from django.views.generic import RedirectView
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework_simplejwt.views import TokenRefreshView

from core.auth import RoleAwareTokenObtainPairView
from core.views import GoogleOAuthView

urlpatterns = [
    path("", RedirectView.as_view(pattern_name="swagger-ui", permanent=False)),
    path("admin/", admin.site.urls),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/auth/token/", RoleAwareTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/auth/google/", GoogleOAuthView.as_view(), name="google_oauth"),
    path("api/v1/core/", include("core.urls")),
    path("api/v1/projects/", include("projects.urls")),
    path("api/v1/finance/", include("finance.urls")),
    path("api/v1/procurement/", include("procurement.urls")),
    path("api/v1/real-estate/", include("real_estate.urls")),
    path("api/v1/payments/", include("payments.urls")),
    path("api/v2/", include("erp_v2.urls")),
]

