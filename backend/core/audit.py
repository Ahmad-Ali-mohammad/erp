from __future__ import annotations

import json
from collections.abc import Mapping
from datetime import date, datetime, time
from decimal import Decimal

from django.db.models import Model

from core.models import AuditLog


class AuditLogMixin:
    def _to_json_safe(self, value):
        if isinstance(value, Model):
            return value.pk
        if isinstance(value, Decimal):
            return str(value)
        if isinstance(value, (date, datetime, time)):
            return value.isoformat()
        if isinstance(value, Mapping):
            return {str(key): self._to_json_safe(item) for key, item in value.items()}
        if isinstance(value, (list, tuple, set)):
            return [self._to_json_safe(item) for item in value]
        if isinstance(value, bytes):
            return value.decode(errors="replace")

        try:
            json.dumps(value)
            return value
        except TypeError:
            return str(value)

    def _build_changes(self, instance, validated_data):
        changes = {}
        for field, value in validated_data.items():
            try:
                current_value = getattr(instance, field)
            except Exception:
                current_value = None
            if current_value != value:
                changes[field] = {
                    "from": self._to_json_safe(current_value),
                    "to": self._to_json_safe(value),
                }
        return changes

    def log_action(self, *, action: str, instance, changes=None):
        request = getattr(self, "request", None)
        user = getattr(request, "user", None) if request else None
        if not user or not user.is_authenticated:
            return

        AuditLog.objects.create(
            user=user,
            action=action,
            model_name=instance.__class__.__name__,
            object_id=str(instance.pk),
            changes=self._to_json_safe(changes or {}),
            ip_address=request.META.get("REMOTE_ADDR") if request else None,
            user_agent=request.META.get("HTTP_USER_AGENT", "") if request else "",
        )

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
