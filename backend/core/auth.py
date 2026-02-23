from __future__ import annotations

from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView


class RoleAwareTokenObtainPairSerializer(TokenObtainPairSerializer):
    @staticmethod
    def _build_permission_claims(user) -> list[str]:
        # Keep JWT size bounded for cookie storage:
        # - superusers get a compact wildcard claim
        # - other users only get explicitly assigned permissions
        if user.is_superuser:
            return ["full_access"]
        explicit_permissions = sorted(
            set(user.get_user_permissions()) | set(user.get_group_permissions())
        )
        return explicit_permissions

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        role = getattr(user, "role", None)
        is_customer = getattr(user, "is_customer", False)
        token["username"] = user.get_username()
        token["role_id"] = getattr(role, "id", None)
        token["role_name"] = getattr(role, "name", None) or ("Customer" if is_customer else None)
        token["role_slug"] = getattr(role, "slug", None) or ("customer" if is_customer else None)
        token["permissions"] = cls._build_permission_claims(user)

        return token


class RoleAwareTokenObtainPairView(TokenObtainPairView):
    serializer_class = RoleAwareTokenObtainPairSerializer
