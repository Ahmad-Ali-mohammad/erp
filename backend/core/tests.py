from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Role, User


class TestCoreSmoke(APITestCase):
    def test_health_endpoint_is_public(self):
        response = self.client.get(reverse("health"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "ok")

    def test_role_creation(self):
        role = Role.objects.create(name="Accountant", slug="accountant")
        user = User.objects.create_user(username="admin", password="pass1234", is_staff=True)
        self.client.force_authenticate(user=user)

        payload = {"name": "Project Manager", "slug": "project-manager"}
        response = self.client.post("/api/v1/core/roles/", payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Role.objects.count(), 2)
        self.assertEqual(role.slug, "accountant")


class TestCompanyProfile(APITestCase):
    def setUp(self):
        role = Role.objects.create(name="Accountant", slug="accountant")
        self.user = User.objects.create_user(username="acct", password="pass1234", role=role)
        self.client.force_authenticate(user=self.user)

    def test_company_profile_get_and_patch(self):
        response = self.client.get("/api/v1/core/company-profile/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        payload = {
            "name": "Acme Construction",
            "legal_name": "Acme Construction LLC",
            "phone": "+965 5555 5555",
            "email": "info@example.com",
            "tax_number": "TAX-123",
        }
        update_response = self.client.patch("/api/v1/core/company-profile/", payload, format="json")
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertEqual(update_response.data["name"], "Acme Construction")
        self.assertEqual(update_response.data["tax_number"], "TAX-123")
