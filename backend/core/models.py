from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models
from decimal import Decimal


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Role(TimeStampedModel):
    name = models.CharField(max_length=80, unique=True)
    slug = models.SlugField(max_length=80, unique=True)
    description = models.TextField(blank=True)
    is_system = models.BooleanField(default=False)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class User(AbstractUser):
    role = models.ForeignKey(
        Role,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="users",
    )
    phone_number = models.CharField(max_length=30, blank=True)
    job_title = models.CharField(max_length=120, blank=True)
    is_field_staff = models.BooleanField(default=False)
    is_customer = models.BooleanField(default=False)

    class Meta:
        indexes = [
            models.Index(fields=["role"]),
            models.Index(fields=["is_field_staff"]),
        ]

    def __str__(self) -> str:
        return self.get_full_name() or self.username


class AuditLog(TimeStampedModel):
    class Action(models.TextChoices):
        CREATE = "create", "Create"
        UPDATE = "update", "Update"
        DELETE = "delete", "Delete"
        LOGIN = "login", "Login"
        EXPORT = "export", "Export"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )
    action = models.CharField(max_length=20, choices=Action.choices)
    model_name = models.CharField(max_length=120)
    object_id = models.CharField(max_length=64)
    changes = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["model_name", "object_id"]),
            models.Index(fields=["action"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.action}:{self.model_name}:{self.object_id}"


class CompanyProfile(TimeStampedModel):
    name = models.CharField(max_length=200, blank=True, default="")
    legal_name = models.CharField(max_length=200, blank=True, default="")
    logo_url = models.URLField(blank=True, default="")
    address = models.TextField(blank=True, default="")
    phone = models.CharField(max_length=40, blank=True, default="")
    email = models.EmailField(blank=True, default="")
    tax_number = models.CharField(max_length=80, blank=True, default="")
    website = models.URLField(blank=True, default="")
    base_currency = models.CharField(max_length=3, default="KWD")
    tax_policy = models.CharField(max_length=40, blank=True, default="standard")
    default_tax_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("0.00"),
    )
    primary_color = models.CharField(max_length=20, blank=True, default="#0f2a43")
    secondary_color = models.CharField(max_length=20, blank=True, default="#c89b3c")

    class Meta:
        verbose_name = "Company Profile"
        verbose_name_plural = "Company Profile"

    def __str__(self) -> str:
        return self.name or "Company Profile"


class Customer(TimeStampedModel):
    code = models.CharField(max_length=40, unique=True)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="customer_profile",
    )
    name = models.CharField(max_length=255)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=40, blank=True)
    tax_number = models.CharField(max_length=80, blank=True)
    billing_address = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return f"{self.code} - {self.name}"


class ExternalAuthAccount(TimeStampedModel):
    class Provider(models.TextChoices):
        GOOGLE = "google", "Google"

    provider = models.CharField(max_length=20, choices=Provider.choices)
    subject = models.CharField(max_length=255)
    email = models.EmailField(blank=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="external_accounts",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["provider", "subject"],
                name="core_external_auth_unique_provider_subject",
            )
        ]
        indexes = [models.Index(fields=["provider", "subject"])]

    def __str__(self) -> str:
        return f"{self.provider}:{self.subject}"


class Sequence(TimeStampedModel):
    key = models.CharField(max_length=80, unique=True)
    prefix = models.CharField(max_length=40, blank=True, default="")
    padding = models.PositiveIntegerField(default=4)
    next_number = models.PositiveIntegerField(default=1)
    suffix = models.CharField(max_length=20, blank=True, default="")
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["key"]

    def __str__(self) -> str:
        return f"{self.key} ({self.prefix}{self.next_number})"


class Document(TimeStampedModel):
    name = models.CharField(max_length=255)
    file = models.FileField(upload_to="documents/")
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveBigIntegerField()
    content_object = GenericForeignKey("content_type", "object_id")
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="uploaded_documents",
    )
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["content_type", "object_id"]),
        ]

    def __str__(self) -> str:
        return self.name
