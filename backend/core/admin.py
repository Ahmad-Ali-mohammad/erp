from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import AuditLog, CompanyProfile, Customer, Document, ExternalAuthAccount, Role, Sequence, User


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "is_system", "updated_at")
    search_fields = ("name", "slug")
    list_filter = ("is_system",)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("username", "email", "first_name", "last_name", "role", "is_active")
    list_filter = ("role", "is_active", "is_staff", "is_field_staff", "is_customer")

    fieldsets = BaseUserAdmin.fieldsets + (
        (
            "ERP Profile",
            {
                "fields": (
                    "role",
                    "phone_number",
                    "job_title",
                    "is_field_staff",
                    "is_customer",
                )
            },
        ),
    )


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("action", "model_name", "object_id", "user", "created_at")
    list_filter = ("action", "model_name", "created_at")
    search_fields = ("model_name", "object_id", "user__username")
    readonly_fields = ("created_at", "updated_at")


@admin.register(CompanyProfile)
class CompanyProfileAdmin(admin.ModelAdmin):
    list_display = ("name", "legal_name", "phone", "email", "updated_at")
    search_fields = ("name", "legal_name", "tax_number", "email")


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "email", "phone", "is_active", "updated_at")
    search_fields = ("code", "name", "email", "phone")
    list_filter = ("is_active",)


@admin.register(ExternalAuthAccount)
class ExternalAuthAccountAdmin(admin.ModelAdmin):
    list_display = ("provider", "subject", "email", "user", "created_at")
    search_fields = ("provider", "subject", "email", "user__username")


@admin.register(Sequence)
class SequenceAdmin(admin.ModelAdmin):
    list_display = ("key", "prefix", "padding", "next_number", "is_active", "updated_at")
    search_fields = ("key", "prefix")
    list_filter = ("is_active",)


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ("name", "content_type", "object_id", "uploaded_by", "created_at")
    search_fields = ("name", "notes")
    list_filter = ("content_type",)
