from django.utils.timezone import now
from rest_framework import mixins, status, viewsets
from django.conf import settings
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.access import ActionBasedRolePermission, ROLE_ACCOUNTANT, ROLE_ADMIN, ROLE_PROJECT_MANAGER
from core.audit import AuditLogMixin
from core.auth import RoleAwareTokenObtainPairSerializer
from .models import AuditLog, Customer, Document, ExternalAuthAccount, Role, Sequence, User
from .serializers import (
    AuditLogSerializer,
    CompanyProfileSerializer,
    CustomerSerializer,
    DocumentSerializer,
    RoleSerializer,
    SequenceSerializer,
    UserSerializer,
)
from .services.company_profile import get_company_profile
from .services.sequence import next_sequence


class HealthCheckView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(
            {
                "status": "ok",
                "service": "construction-erp-backend",
                "timestamp": now().isoformat(),
            }
        )


class RoleViewSet(AuditLogMixin, viewsets.ModelViewSet):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [IsAuthenticated]
    search_fields = ["name", "slug"]
    ordering_fields = ["name", "updated_at"]

    def perform_create(self, serializer):
        instance = serializer.save()
        self.log_action(action="create", instance=instance, changes=serializer.validated_data)

    def perform_update(self, serializer):
        instance = self.get_object()
        changes = self._build_changes(instance, serializer.validated_data)
        instance = serializer.save()
        self.log_action(action="update", instance=instance, changes=changes)

    def perform_destroy(self, instance):
        self.log_action(action="delete", instance=instance)
        instance.delete()


class UserViewSet(AuditLogMixin, viewsets.ModelViewSet):
    queryset = User.objects.select_related("role").all()
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]
    search_fields = ["username", "email", "first_name", "last_name"]
    ordering_fields = ["username", "date_joined"]

    def perform_create(self, serializer):
        instance = serializer.save()
        self.log_action(action="create", instance=instance, changes=serializer.validated_data)

    def perform_update(self, serializer):
        instance = self.get_object()
        changes = self._build_changes(instance, serializer.validated_data)
        instance = serializer.save()
        self.log_action(action="update", instance=instance, changes=changes)

    def perform_destroy(self, instance):
        self.log_action(action="delete", instance=instance)
        instance.delete()


class AuditLogViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    queryset = AuditLog.objects.select_related("user").all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdminUser]
    search_fields = ["model_name", "object_id", "user__username"]
    filterset_fields = ["action", "model_name"]
    ordering_fields = ["created_at"]


class CompanyProfileViewSet(viewsets.ViewSet):
    permission_classes = [ActionBasedRolePermission]
    action_role_map = {
        "list": {ROLE_ADMIN, ROLE_ACCOUNTANT},
        "retrieve": {ROLE_ADMIN, ROLE_ACCOUNTANT},
        "update": {ROLE_ADMIN, ROLE_ACCOUNTANT},
        "partial_update": {ROLE_ADMIN, ROLE_ACCOUNTANT},
    }

    def _get_instance(self):
        return get_company_profile()

    def list(self, request):
        instance = self._get_instance()
        return Response(CompanyProfileSerializer(instance).data)

    def retrieve(self, request, pk=None):
        instance = self._get_instance()
        return Response(CompanyProfileSerializer(instance).data)

    def update(self, request, pk=None):
        instance = self._get_instance()
        serializer = CompanyProfileSerializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def partial_update(self, request, pk=None):
        return self.update(request, pk=pk)


class CustomerViewSet(AuditLogMixin, viewsets.ModelViewSet):
    queryset = Customer.objects.select_related("user").all()
    serializer_class = CustomerSerializer
    permission_classes = [ActionBasedRolePermission]
    action_role_map = {
        "list": {ROLE_ADMIN, ROLE_ACCOUNTANT, ROLE_PROJECT_MANAGER},
        "retrieve": {ROLE_ADMIN, ROLE_ACCOUNTANT, ROLE_PROJECT_MANAGER},
        "create": {ROLE_ADMIN, ROLE_ACCOUNTANT},
        "update": {ROLE_ADMIN, ROLE_ACCOUNTANT},
        "partial_update": {ROLE_ADMIN, ROLE_ACCOUNTANT},
        "destroy": {ROLE_ADMIN},
    }
    search_fields = ["code", "name", "email", "phone"]
    ordering_fields = ["name", "created_at", "code"]

    def perform_create(self, serializer):
        instance = serializer.save()
        self.log_action(action="create", instance=instance, changes=serializer.validated_data)

    def perform_update(self, serializer):
        instance = self.get_object()
        changes = self._build_changes(instance, serializer.validated_data)
        instance = serializer.save()
        self.log_action(action="update", instance=instance, changes=changes)

    def perform_destroy(self, instance):
        self.log_action(action="delete", instance=instance)
        instance.delete()


class SequenceViewSet(AuditLogMixin, viewsets.ModelViewSet):
    queryset = Sequence.objects.all()
    serializer_class = SequenceSerializer
    permission_classes = [IsAdminUser]
    search_fields = ["key", "prefix"]
    ordering_fields = ["key", "updated_at"]

    def perform_create(self, serializer):
        instance = serializer.save()
        self.log_action(action="create", instance=instance, changes=serializer.validated_data)

    def perform_update(self, serializer):
        instance = self.get_object()
        changes = self._build_changes(instance, serializer.validated_data)
        instance = serializer.save()
        self.log_action(action="update", instance=instance, changes=changes)

    def perform_destroy(self, instance):
        self.log_action(action="delete", instance=instance)
        instance.delete()


class DocumentViewSet(AuditLogMixin, viewsets.ModelViewSet):
    queryset = Document.objects.select_related("uploaded_by", "content_type").all()
    serializer_class = DocumentSerializer
    permission_classes = [ActionBasedRolePermission]
    action_role_map = {
        "list": {ROLE_ADMIN, ROLE_ACCOUNTANT, ROLE_PROJECT_MANAGER},
        "retrieve": {ROLE_ADMIN, ROLE_ACCOUNTANT, ROLE_PROJECT_MANAGER},
        "create": {ROLE_ADMIN, ROLE_ACCOUNTANT, ROLE_PROJECT_MANAGER},
        "update": {ROLE_ADMIN, ROLE_ACCOUNTANT, ROLE_PROJECT_MANAGER},
        "partial_update": {ROLE_ADMIN, ROLE_ACCOUNTANT, ROLE_PROJECT_MANAGER},
        "destroy": {ROLE_ADMIN, ROLE_ACCOUNTANT},
    }
    parser_classes = [MultiPartParser, FormParser]
    filterset_fields = ["content_type", "object_id", "uploaded_by"]
    search_fields = ["name", "notes"]
    ordering_fields = ["created_at", "name"]

    def perform_create(self, serializer):
        instance = serializer.save(uploaded_by=self.request.user)
        self.log_action(action="create", instance=instance, changes=serializer.validated_data)

    def perform_update(self, serializer):
        instance = self.get_object()
        changes = self._build_changes(instance, serializer.validated_data)
        instance = serializer.save()
        self.log_action(action="update", instance=instance, changes=changes)

    def perform_destroy(self, instance):
        self.log_action(action="delete", instance=instance)
        instance.delete()


class GoogleOAuthView(APIView):
    permission_classes = [AllowAny]

    def _get_or_create_user(self, payload, is_customer: bool) -> User:
        subject = payload.get("sub")
        email = payload.get("email") or ""
        external = ExternalAuthAccount.objects.filter(
            provider=ExternalAuthAccount.Provider.GOOGLE,
            subject=subject,
        ).select_related("user").first()
        if external:
            user = external.user
        else:
            user = User.objects.filter(email__iexact=email).first()
            if not user:
                base_username = (email.split("@")[0] if email else "google-user").strip() or "google-user"
                username = base_username
                counter = 1
                while User.objects.filter(username=username).exists():
                    counter += 1
                    username = f"{base_username}-{counter}"
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    first_name=payload.get("given_name", ""),
                    last_name=payload.get("family_name", ""),
                    is_customer=is_customer,
                )
            if is_customer and not user.is_customer:
                user.is_customer = True
                user.save(update_fields=["is_customer"])

            ExternalAuthAccount.objects.create(
                provider=ExternalAuthAccount.Provider.GOOGLE,
                subject=subject,
                email=email,
                user=user,
            )

        if is_customer:
            if not hasattr(user, "customer_profile") or user.customer_profile is None:
                customer_code = next_sequence("customer", prefix="CUST-", padding=5)
                Customer.objects.create(
                    code=customer_code,
                    user=user,
                    name=payload.get("name") or user.get_full_name() or email or customer_code,
                    email=email,
                )

        return user

    def post(self, request):
        raw_token = request.data.get("id_token") or request.data.get("credential")
        if not raw_token:
            raise ValidationError({"id_token": "Google ID token is required."})

        client_id = getattr(settings, "GOOGLE_OAUTH_CLIENT_ID", None)
        if not client_id:
            raise ValidationError({"google_oauth": "GOOGLE_OAUTH_CLIENT_ID is not configured."})

        try:
            from google.auth.transport import requests as google_requests
            from google.oauth2 import id_token as google_id_token

            payload = google_id_token.verify_oauth2_token(raw_token, google_requests.Request(), client_id)
        except ImportError as exc:
            raise ValidationError({"google_oauth": "google-auth library is not installed."}) from exc
        except ValueError as exc:
            raise ValidationError({"id_token": "Invalid Google token."}) from exc

        user_type = str(request.data.get("user_type") or "employee").lower()
        is_customer = user_type == "customer"

        user = self._get_or_create_user(payload, is_customer=is_customer)
        refresh = RoleAwareTokenObtainPairSerializer.get_token(user)
        return Response(
            {
                "refresh": str(refresh),
                "access": str(refresh.access_token),
                "user": UserSerializer(user).data,
            },
            status=status.HTTP_200_OK,
        )
