from __future__ import annotations

import os
from collections.abc import Iterable

from django.db.models import Q
from rest_framework.permissions import BasePermission, SAFE_METHODS

ROLE_ADMIN = "admin"
ROLE_ACCOUNTANT = "accountant"
ROLE_PROJECT_MANAGER = "project-manager"
ROLE_SITE_SUPERVISOR = "site-supervisor"
ROLE_CASHIER = "cashier"
ROLE_STOREKEEPER = "storekeeper"
ROLE_CUSTOMER = "customer"
ROLE_UNASSIGNED = None


def get_user_role_slug(user) -> str | None:
    role = getattr(user, "role", None)
    role_slug = getattr(role, "slug", None)
    if getattr(user, "is_customer", False) and not role_slug:
        return ROLE_CUSTOMER
    return role_slug


class ActionBasedRolePermission(BasePermission):
    message = "You are not allowed to perform this action."

    def has_permission(self, request, view) -> bool:
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True

        # Optional toggle to force v1 APIs into read-only mode
        if (
            os.getenv("API_V1_READONLY", "").lower() == "true"
            and request.method not in SAFE_METHODS
            and request.path.startswith("/api/v1/")
        ):
            return False

        action_role_map: dict[str, Iterable[str | None]] = getattr(view, "action_role_map", {})
        if not action_role_map:
            return True

        action = getattr(view, "action", None)
        allowed_roles = action_role_map.get(action, action_role_map.get("*"))
        if allowed_roles is None:
            return True

        role_slug = get_user_role_slug(user)
        return role_slug in set(allowed_roles)


class RowLevelScopeMixin:
    user_scope_fields: tuple[str, ...] = ()
    global_scope_role_slugs: tuple[str, ...] = (ROLE_ADMIN, ROLE_ACCOUNTANT)

    def apply_row_level_scope(self, queryset):
        user = self.request.user
        if not user or not user.is_authenticated:
            return queryset.none()
        if user.is_superuser:
            return queryset

        role_slug = get_user_role_slug(user)
        if role_slug in self.global_scope_role_slugs:
            return queryset

        if not self.user_scope_fields:
            return queryset.none()

        row_scope = Q()
        for lookup in self.user_scope_fields:
            row_scope |= Q(**{lookup: user})
        return queryset.filter(row_scope).distinct()
