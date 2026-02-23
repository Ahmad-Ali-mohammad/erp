from rest_framework import serializers

from .models import AuditLog, CompanyProfile, Customer, Document, Role, Sequence, User


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ["id", "name", "slug", "description", "is_system", "created_at", "updated_at"]
        read_only_fields = ["created_at", "updated_at"]


class UserSerializer(serializers.ModelSerializer):
    role = RoleSerializer(read_only=True)
    role_id = serializers.PrimaryKeyRelatedField(
        source="role",
        queryset=Role.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
    )

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "email",
            "phone_number",
            "job_title",
            "is_field_staff",
            "is_customer",
            "is_active",
            "role",
            "role_id",
            "date_joined",
        ]
        read_only_fields = ["date_joined"]


class AuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            "id",
            "action",
            "model_name",
            "object_id",
            "changes",
            "ip_address",
            "user_agent",
            "user",
            "user_name",
            "created_at",
        ]
        read_only_fields = ["created_at"]


class CompanyProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanyProfile
        fields = [
            "id",
            "name",
            "legal_name",
            "logo_url",
            "address",
            "phone",
            "email",
            "tax_number",
            "website",
            "base_currency",
            "tax_policy",
            "default_tax_rate",
            "primary_color",
            "secondary_color",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = [
            "id",
            "code",
            "user",
            "name",
            "email",
            "phone",
            "tax_number",
            "billing_address",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class SequenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sequence
        fields = [
            "id",
            "key",
            "prefix",
            "padding",
            "next_number",
            "suffix",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = [
            "id",
            "name",
            "file",
            "content_type",
            "object_id",
            "uploaded_by",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["uploaded_by", "created_at", "updated_at"]
