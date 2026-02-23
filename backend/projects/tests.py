from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import Role
from .models import Project, ProjectBudgetLine


class TestProjectApi(APITestCase):
    def setUp(self):
        pm_role = Role.objects.create(name="Project Manager", slug="project-manager")
        self.user = get_user_model().objects.create_user(username="pm", password="pass1234", role=pm_role)
        self.other_user = get_user_model().objects.create_user(username="pm-other", password="pass1234")
        self.client.force_authenticate(user=self.user)

    def test_create_project(self):
        payload = {
            "code": "PRJ-001",
            "name": "Tower 1",
            "client_name": "ACME",
            "budget": "1000000.00",
            "contract_value": "1250000.00",
        }
        response = self.client.post("/api/v1/projects/projects/", payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Project.objects.count(), 1)
        self.assertEqual(Project.objects.first().code, "PRJ-001")

    def test_row_level_scope_blocks_other_users_from_project(self):
        payload = {
            "code": "PRJ-ROW-001",
            "name": "Scoped Project",
            "client_name": "Scoped Client",
            "budget": "1000.00",
            "contract_value": "1200.00",
        }
        create_project = self.client.post("/api/v1/projects/projects/", payload, format="json")
        self.assertEqual(create_project.status_code, status.HTTP_201_CREATED)
        project_id = create_project.data["id"]

        self.client.force_authenticate(user=self.other_user)
        retrieve_project = self.client.get(f"/api/v1/projects/projects/{project_id}/")
        self.assertEqual(retrieve_project.status_code, status.HTTP_404_NOT_FOUND)

    def test_list_projects_requires_auth(self):
        self.client.force_authenticate(user=None)
        response = self.client.get(reverse("project-list"))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_job_costing_budget_vs_actual_summary(self):
        create_project = self.client.post(
            "/api/v1/projects/projects/",
            {
                "code": "PRJ-COST-001",
                "name": "Cost Control Project",
                "client_name": "ACME",
                "budget": "50000.00",
                "contract_value": "60000.00",
            },
            format="json",
        )
        self.assertEqual(create_project.status_code, status.HTTP_201_CREATED)
        project_id = create_project.data["id"]

        create_cost_code = self.client.post(
            "/api/v1/projects/cost-codes/",
            {
                "project": project_id,
                "code": "CC-100",
                "name": "Concrete Works",
            },
            format="json",
        )
        self.assertEqual(create_cost_code.status_code, status.HTTP_201_CREATED)
        cost_code_id = create_cost_code.data["id"]

        create_budget_line = self.client.post(
            "/api/v1/projects/budget-lines/",
            {
                "project": project_id,
                "cost_code": cost_code_id,
                "baseline_amount": "10000.00",
            },
            format="json",
        )
        self.assertEqual(create_budget_line.status_code, status.HTTP_201_CREATED)
        self.assertEqual(create_budget_line.data["revised_amount"], "10000.00")

        create_commitment = self.client.post(
            "/api/v1/projects/cost-records/",
            {
                "project": project_id,
                "cost_code": cost_code_id,
                "record_type": "commitment",
                "amount": "3500.00",
                "source_module": "procurement",
                "source_reference": "PO-100",
            },
            format="json",
        )
        self.assertEqual(create_commitment.status_code, status.HTTP_201_CREATED)
        self.assertEqual(create_commitment.data["created_by"], self.user.id)

        create_actual = self.client.post(
            "/api/v1/projects/cost-records/",
            {
                "project": project_id,
                "cost_code": cost_code_id,
                "record_type": "actual",
                "amount": "2500.00",
                "source_module": "finance",
                "source_reference": "INV-100",
            },
            format="json",
        )
        self.assertEqual(create_actual.status_code, status.HTTP_201_CREATED)

        summary = self.client.get(f"/api/v1/projects/projects/{project_id}/cost-summary/")
        self.assertEqual(summary.status_code, status.HTTP_200_OK)
        self.assertEqual(summary.data["project_id"], project_id)
        self.assertEqual(summary.data["project_code"], "PRJ-COST-001")
        self.assertEqual(summary.data["totals"]["budget"], "10000.00")
        self.assertEqual(summary.data["totals"]["commitments"], "3500.00")
        self.assertEqual(summary.data["totals"]["actual"], "2500.00")
        self.assertEqual(summary.data["totals"]["available"], "7500.00")
        self.assertEqual(summary.data["totals"]["variance"], "7500.00")
        self.assertEqual(len(summary.data["lines"]), 1)
        self.assertEqual(summary.data["lines"][0]["cost_code"], "CC-100")

    def test_row_level_scope_blocks_other_users_from_costing_records(self):
        create_project = self.client.post(
            "/api/v1/projects/projects/",
            {
                "code": "PRJ-COST-ROW-001",
                "name": "Row Scope Cost Project",
                "client_name": "Scoped Client",
                "budget": "1000.00",
                "contract_value": "1200.00",
            },
            format="json",
        )
        self.assertEqual(create_project.status_code, status.HTTP_201_CREATED)
        project_id = create_project.data["id"]

        create_cost_code = self.client.post(
            "/api/v1/projects/cost-codes/",
            {
                "project": project_id,
                "code": "CC-ROW-100",
                "name": "Scoped Cost Code",
            },
            format="json",
        )
        self.assertEqual(create_cost_code.status_code, status.HTTP_201_CREATED)
        cost_code_id = create_cost_code.data["id"]

        create_budget_line = self.client.post(
            "/api/v1/projects/budget-lines/",
            {
                "project": project_id,
                "cost_code": cost_code_id,
                "baseline_amount": "500.00",
                "revised_amount": "600.00",
            },
            format="json",
        )
        self.assertEqual(create_budget_line.status_code, status.HTTP_201_CREATED)
        budget_line_id = create_budget_line.data["id"]

        self.client.force_authenticate(user=self.other_user)
        retrieve_budget_line = self.client.get(f"/api/v1/projects/budget-lines/{budget_line_id}/")
        self.assertEqual(retrieve_budget_line.status_code, status.HTTP_404_NOT_FOUND)

        list_cost_codes = self.client.get("/api/v1/projects/cost-codes/")
        self.assertEqual(list_cost_codes.status_code, status.HTTP_200_OK)
        self.assertEqual(list_cost_codes.data["count"], 0)

    def test_change_order_approval_updates_project_and_budget_line(self):
        create_project = self.client.post(
            "/api/v1/projects/projects/",
            {
                "code": "PRJ-CO-001",
                "name": "Change Order Project",
                "client_name": "ACME",
                "budget": "1000.00",
                "contract_value": "1200.00",
            },
            format="json",
        )
        self.assertEqual(create_project.status_code, status.HTTP_201_CREATED)
        project_id = create_project.data["id"]

        create_cost_code = self.client.post(
            "/api/v1/projects/cost-codes/",
            {
                "project": project_id,
                "code": "CC-CO-001",
                "name": "Concrete",
            },
            format="json",
        )
        self.assertEqual(create_cost_code.status_code, status.HTTP_201_CREATED)
        cost_code_id = create_cost_code.data["id"]

        create_budget_line = self.client.post(
            "/api/v1/projects/budget-lines/",
            {
                "project": project_id,
                "cost_code": cost_code_id,
                "baseline_amount": "500.00",
                "revised_amount": "500.00",
            },
            format="json",
        )
        self.assertEqual(create_budget_line.status_code, status.HTTP_201_CREATED)
        budget_line_id = create_budget_line.data["id"]

        create_change_order = self.client.post(
            "/api/v1/projects/change-orders/",
            {
                "project": project_id,
                "order_number": "CO-001",
                "title": "Extra concrete",
                "lines": [
                    {
                        "cost_code": cost_code_id,
                        "description": "Additional concrete works",
                        "contract_value_delta": "200.00",
                        "budget_delta": "100.00",
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(create_change_order.status_code, status.HTTP_201_CREATED)
        change_order_id = create_change_order.data["id"]

        submit_change_order = self.client.post(
            f"/api/v1/projects/change-orders/{change_order_id}/submit/",
            {},
            format="json",
        )
        self.assertEqual(submit_change_order.status_code, status.HTTP_200_OK)
        self.assertEqual(submit_change_order.data["status"], "pending_approval")

        approve_change_order = self.client.post(
            f"/api/v1/projects/change-orders/{change_order_id}/approve/",
            {},
            format="json",
        )
        self.assertEqual(approve_change_order.status_code, status.HTTP_200_OK)
        self.assertEqual(approve_change_order.data["status"], "approved")

        project_after = self.client.get(f"/api/v1/projects/projects/{project_id}/")
        self.assertEqual(project_after.status_code, status.HTTP_200_OK)
        self.assertEqual(project_after.data["budget"], "1100.00")
        self.assertEqual(project_after.data["contract_value"], "1400.00")

        budget_line_after = self.client.get(f"/api/v1/projects/budget-lines/{budget_line_id}/")
        self.assertEqual(budget_line_after.status_code, status.HTTP_200_OK)
        self.assertEqual(budget_line_after.data["revised_amount"], "600.00")

    def test_close_project_blocks_new_project_transactions(self):
        create_project = self.client.post(
            "/api/v1/projects/projects/",
            {
                "code": "PRJ-CLOSE-001",
                "name": "Close Project",
                "client_name": "ACME",
                "budget": "1000.00",
                "contract_value": "1200.00",
            },
            format="json",
        )
        self.assertEqual(create_project.status_code, status.HTTP_201_CREATED)
        project_id = create_project.data["id"]

        close_project = self.client.post(f"/api/v1/projects/projects/{project_id}/close/", {}, format="json")
        self.assertEqual(close_project.status_code, status.HTTP_200_OK)
        self.assertEqual(close_project.data["status"], "completed")
        self.assertIsNotNone(close_project.data["closed_at"])

        create_phase = self.client.post(
            "/api/v1/projects/phases/",
            {
                "project": project_id,
                "name": "Closed phase",
                "sequence": 1,
            },
            format="json",
        )
        self.assertEqual(create_phase.status_code, status.HTTP_400_BAD_REQUEST)

        create_cost_code = self.client.post(
            "/api/v1/projects/cost-codes/",
            {
                "project": project_id,
                "code": "CC-CLOSED-001",
                "name": "Closed code",
            },
            format="json",
        )
        self.assertEqual(create_cost_code.status_code, status.HTTP_400_BAD_REQUEST)

        project_budget_lines = ProjectBudgetLine.objects.filter(project_id=project_id)
        self.assertEqual(project_budget_lines.count(), 0)
