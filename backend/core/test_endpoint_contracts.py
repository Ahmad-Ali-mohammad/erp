from datetime import date

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import AccessToken

from core.models import Role


class TestEndpointContracts(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.password = "pass1234"

        self.accountant_role = Role.objects.create(name="Accountant", slug="accountant")
        self.project_manager_role = Role.objects.create(name="Project Manager", slug="project-manager")

        self.admin_user = user_model.objects.create_superuser(
            username="admin-api",
            email="admin-api@example.com",
            password=self.password,
        )
        self.accountant_user = user_model.objects.create_user(
            username="accountant-api",
            password=self.password,
            role=self.accountant_role,
        )
        self.project_manager_user = user_model.objects.create_user(
            username="pm-api",
            password=self.password,
            role=self.project_manager_role,
        )

    def _assert_paginated_response(self, response):
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("count", response.data)
        self.assertIn("next", response.data)
        self.assertIn("previous", response.data)
        self.assertIn("results", response.data)

    def test_health_and_jwt_endpoints_contract(self):
        health_response = self.client.get("/api/v1/core/health/")
        self.assertEqual(health_response.status_code, status.HTTP_200_OK)
        self.assertEqual(health_response.data["status"], "ok")
        self.assertIn("service", health_response.data)
        self.assertIn("timestamp", health_response.data)

        token_response = self.client.post(
            "/api/auth/token/",
            {"username": self.accountant_user.username, "password": self.password},
            format="json",
        )
        self.assertEqual(token_response.status_code, status.HTTP_200_OK)
        self.assertIn("access", token_response.data)
        self.assertIn("refresh", token_response.data)
        access_payload = AccessToken(token_response.data["access"])
        self.assertEqual(access_payload["username"], self.accountant_user.username)
        self.assertEqual(access_payload["role_slug"], self.accountant_role.slug)
        self.assertEqual(access_payload["role_name"], self.accountant_role.name)
        self.assertEqual(access_payload["role_id"], self.accountant_role.id)
        self.assertIn("permissions", access_payload)
        self.assertIsInstance(access_payload["permissions"], list)

        refresh_response = self.client.post(
            "/api/auth/token/refresh/",
            {"refresh": token_response.data["refresh"]},
            format="json",
        )
        self.assertEqual(refresh_response.status_code, status.HTTP_200_OK)
        self.assertIn("access", refresh_response.data)
        refreshed_access_payload = AccessToken(refresh_response.data["access"])
        self.assertEqual(refreshed_access_payload["role_slug"], self.accountant_role.slug)
        self.assertIn("permissions", refreshed_access_payload)

    def test_core_endpoints_contract(self):
        self.client.force_authenticate(user=self.admin_user)

        create_role = self.client.post(
            "/api/v1/core/roles/",
            {"name": "Site Engineer", "slug": "site-engineer"},
            format="json",
        )
        self.assertEqual(create_role.status_code, status.HTTP_201_CREATED)
        self.assertIn("id", create_role.data)
        created_role_id = create_role.data["id"]

        list_roles = self.client.get("/api/v1/core/roles/")
        self._assert_paginated_response(list_roles)
        self.assertTrue(any(role["id"] == created_role_id for role in list_roles.data["results"]))

        create_user = self.client.post(
            "/api/v1/core/users/",
            {
                "username": "frontend-user",
                "first_name": "Front",
                "last_name": "End",
                "email": "frontend-user@example.com",
                "role_id": created_role_id,
            },
            format="json",
        )
        self.assertEqual(create_user.status_code, status.HTTP_201_CREATED)
        self.assertIn("role", create_user.data)
        self.assertEqual(create_user.data["role"]["slug"], "site-engineer")
        created_user_id = create_user.data["id"]

        retrieve_user = self.client.get(f"/api/v1/core/users/{created_user_id}/")
        self.assertEqual(retrieve_user.status_code, status.HTTP_200_OK)
        self.assertEqual(retrieve_user.data["id"], created_user_id)
        self.assertEqual(retrieve_user.data["role"]["slug"], "site-engineer")

        list_audit_logs = self.client.get("/api/v1/core/audit-logs/")
        self._assert_paginated_response(list_audit_logs)

        self.client.force_authenticate(user=None)
        unauthenticated_users = self.client.get("/api/v1/core/users/")
        self.assertEqual(unauthenticated_users.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_projects_endpoints_contract(self):
        self.client.force_authenticate(user=self.project_manager_user)

        create_project = self.client.post(
            "/api/v1/projects/projects/",
            {
                "code": "PRJ-API-001",
                "name": "Endpoint Contract Project",
                "client_name": "ACME",
                "budget": "1000000.00",
                "contract_value": "1250000.00",
            },
            format="json",
        )
        self.assertEqual(create_project.status_code, status.HTTP_201_CREATED)
        self.assertEqual(create_project.data["code"], "PRJ-API-001")
        self.assertEqual(create_project.data["created_by"], self.project_manager_user.id)
        project_id = create_project.data["id"]

        create_phase = self.client.post(
            "/api/v1/projects/phases/",
            {"project": project_id, "name": "Foundation", "sequence": 1, "budget": "350000.00"},
            format="json",
        )
        self.assertEqual(create_phase.status_code, status.HTTP_201_CREATED)
        phase_id = create_phase.data["id"]

        create_boq_item = self.client.post(
            "/api/v1/projects/boq-items/",
            {
                "project": project_id,
                "phase": phase_id,
                "item_code": "BOQ-001",
                "description": "Concrete work",
                "unit": "m3",
                "planned_quantity": "100.000",
                "planned_unit_cost": "120.00",
            },
            format="json",
        )
        self.assertEqual(create_boq_item.status_code, status.HTTP_201_CREATED)
        self.assertEqual(create_boq_item.data["planned_total_cost"], "12000.00")
        boq_item_id = create_boq_item.data["id"]

        retrieve_boq_item = self.client.get(f"/api/v1/projects/boq-items/{boq_item_id}/")
        self.assertEqual(retrieve_boq_item.status_code, status.HTTP_200_OK)
        self.assertEqual(retrieve_boq_item.data["id"], boq_item_id)

        create_cost_code = self.client.post(
            "/api/v1/projects/cost-codes/",
            {
                "project": project_id,
                "code": "CC-API-001",
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
                "baseline_amount": "500000.00",
                "revised_amount": "550000.00",
            },
            format="json",
        )
        self.assertEqual(create_budget_line.status_code, status.HTTP_201_CREATED)
        self.assertEqual(create_budget_line.data["revised_amount"], "550000.00")

        create_commitment_record = self.client.post(
            "/api/v1/projects/cost-records/",
            {
                "project": project_id,
                "cost_code": cost_code_id,
                "record_type": "commitment",
                "amount": "100000.00",
                "source_module": "procurement",
                "source_reference": "PO-API-001",
            },
            format="json",
        )
        self.assertEqual(create_commitment_record.status_code, status.HTTP_201_CREATED)

        create_actual_record = self.client.post(
            "/api/v1/projects/cost-records/",
            {
                "project": project_id,
                "cost_code": cost_code_id,
                "record_type": "actual",
                "amount": "95000.00",
                "source_module": "finance",
                "source_reference": "INV-API-001",
            },
            format="json",
        )
        self.assertEqual(create_actual_record.status_code, status.HTTP_201_CREATED)

        get_cost_summary = self.client.get(f"/api/v1/projects/projects/{project_id}/cost-summary/")
        self.assertEqual(get_cost_summary.status_code, status.HTTP_200_OK)
        self.assertEqual(get_cost_summary.data["project_id"], project_id)
        self.assertEqual(get_cost_summary.data["totals"]["budget"], "550000.00")
        self.assertEqual(get_cost_summary.data["totals"]["actual"], "95000.00")

        create_change_order = self.client.post(
            "/api/v1/projects/change-orders/",
            {
                "project": project_id,
                "order_number": "CO-API-001",
                "title": "Contract variation",
                "lines": [
                    {
                        "cost_code": cost_code_id,
                        "description": "Extra works",
                        "contract_value_delta": "25000.00",
                        "budget_delta": "10000.00",
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

        project_after_change_order = self.client.get(f"/api/v1/projects/projects/{project_id}/")
        self.assertEqual(project_after_change_order.status_code, status.HTTP_200_OK)
        self.assertEqual(project_after_change_order.data["contract_value"], "1275000.00")
        self.assertEqual(project_after_change_order.data["budget"], "1010000.00")

        close_project = self.client.post(f"/api/v1/projects/projects/{project_id}/close/", {}, format="json")
        self.assertEqual(close_project.status_code, status.HTTP_200_OK)
        self.assertEqual(close_project.data["status"], "completed")

        create_phase_after_close = self.client.post(
            "/api/v1/projects/phases/",
            {"project": project_id, "name": "Closed phase", "sequence": 99},
            format="json",
        )
        self.assertEqual(create_phase_after_close.status_code, status.HTTP_400_BAD_REQUEST)

        self._assert_paginated_response(self.client.get("/api/v1/projects/projects/"))
        self._assert_paginated_response(self.client.get("/api/v1/projects/phases/"))
        self._assert_paginated_response(self.client.get("/api/v1/projects/boq-items/"))
        self._assert_paginated_response(self.client.get("/api/v1/projects/cost-codes/"))
        self._assert_paginated_response(self.client.get("/api/v1/projects/budget-lines/"))
        self._assert_paginated_response(self.client.get("/api/v1/projects/cost-records/"))
        self._assert_paginated_response(self.client.get("/api/v1/projects/change-orders/"))

    def test_finance_endpoints_contract(self):
        self.client.force_authenticate(user=self.accountant_user)

        create_cash_account = self.client.post(
            "/api/v1/finance/accounts/",
            {"code": "1110", "name": "Cash", "account_type": "asset"},
            format="json",
        )
        self.assertEqual(create_cash_account.status_code, status.HTTP_201_CREATED)
        cash_account_id = create_cash_account.data["id"]

        create_revenue_account = self.client.post(
            "/api/v1/finance/accounts/",
            {"code": "4100", "name": "Revenue", "account_type": "revenue"},
            format="json",
        )
        self.assertEqual(create_revenue_account.status_code, status.HTTP_201_CREATED)
        revenue_account_id = create_revenue_account.data["id"]

        create_entry = self.client.post(
            "/api/v1/finance/journal-entries/",
            {
                "entry_number": "JE-API-001",
                "entry_date": str(date.today()),
                "description": "Contract test entry",
                "status": "draft",
                "lines": [
                    {"account": cash_account_id, "debit": "100.00", "credit": "0.00"},
                    {"account": revenue_account_id, "debit": "0.00", "credit": "100.00"},
                ],
            },
            format="json",
        )
        self.assertEqual(create_entry.status_code, status.HTTP_201_CREATED)
        self.assertEqual(create_entry.data["entry_number"], "JE-API-001")

        create_invoice = self.client.post(
            "/api/v1/finance/invoices/",
            {
                "invoice_number": "INV-API-001",
                "invoice_type": "customer",
                "partner_name": "ACME",
                "issue_date": str(date.today()),
                "items": [
                    {
                        "description": "Milestone billing",
                        "quantity": "1.000",
                        "unit_price": "100.00",
                        "tax_rate": "15.00",
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(create_invoice.status_code, status.HTTP_201_CREATED)
        self.assertEqual(create_invoice.data["total_amount"], "115.00")
        invoice_id = create_invoice.data["id"]

        submit_invoice = self.client.post(f"/api/v1/finance/invoices/{invoice_id}/submit/", {}, format="json")
        self.assertEqual(submit_invoice.status_code, status.HTTP_200_OK)
        self.assertEqual(submit_invoice.data["status"], "pending_approval")

        approve_invoice = self.client.post(f"/api/v1/finance/invoices/{invoice_id}/approve/", {}, format="json")
        self.assertEqual(approve_invoice.status_code, status.HTTP_200_OK)
        self.assertEqual(approve_invoice.data["status"], "issued")

        create_payment = self.client.post(
            "/api/v1/finance/payments/",
            {
                "invoice": invoice_id,
                "payment_date": str(date.today()),
                "amount": "115.00",
                "method": "bank_transfer",
                "reference_no": "TXN-API-001",
            },
            format="json",
        )
        self.assertEqual(create_payment.status_code, status.HTTP_201_CREATED)
        payment_id = create_payment.data["id"]

        submit_payment = self.client.post(f"/api/v1/finance/payments/{payment_id}/submit/", {}, format="json")
        self.assertEqual(submit_payment.status_code, status.HTTP_200_OK)

        approve_payment = self.client.post(f"/api/v1/finance/payments/{payment_id}/approve/", {}, format="json")
        self.assertEqual(approve_payment.status_code, status.HTTP_200_OK)
        self.assertEqual(approve_payment.data["status"], "confirmed")

        retrieve_invoice = self.client.get(f"/api/v1/finance/invoices/{invoice_id}/")
        self.assertEqual(retrieve_invoice.status_code, status.HTTP_200_OK)
        self.assertEqual(retrieve_invoice.data["status"], "paid")

        self.client.force_authenticate(user=self.project_manager_user)
        create_project = self.client.post(
            "/api/v1/projects/projects/",
            {
                "code": "PRJ-FIN-API-001",
                "name": "Finance Contract Project",
                "client_name": "ACME",
                "budget": "900.00",
                "contract_value": "1000.00",
            },
            format="json",
        )
        self.assertEqual(create_project.status_code, status.HTTP_201_CREATED)
        project_id = create_project.data["id"]

        self.client.force_authenticate(user=self.accountant_user)
        create_progress_billing = self.client.post(
            "/api/v1/finance/progress-billings/",
            {
                "project": project_id,
                "billing_number": "PB-API-001",
                "billing_date": str(date.today()),
                "completion_percentage": "10.00",
                "tax_rate": "15.00",
            },
            format="json",
        )
        self.assertEqual(create_progress_billing.status_code, status.HTTP_201_CREATED)
        progress_billing_id = create_progress_billing.data["id"]

        submit_progress_billing = self.client.post(
            f"/api/v1/finance/progress-billings/{progress_billing_id}/submit/",
            {},
            format="json",
        )
        self.assertEqual(submit_progress_billing.status_code, status.HTTP_200_OK)
        self.assertEqual(submit_progress_billing.data["status"], "pending_approval")

        approve_progress_billing = self.client.post(
            f"/api/v1/finance/progress-billings/{progress_billing_id}/approve/",
            {},
            format="json",
        )
        self.assertEqual(approve_progress_billing.status_code, status.HTTP_200_OK)
        self.assertEqual(approve_progress_billing.data["status"], "approved")

        generate_progress_invoice = self.client.post(
            f"/api/v1/finance/progress-billings/{progress_billing_id}/generate-invoice/",
            {},
            format="json",
        )
        self.assertEqual(generate_progress_invoice.status_code, status.HTTP_200_OK)
        self.assertEqual(generate_progress_invoice.data["status"], "invoiced")
        self.assertIsNotNone(generate_progress_invoice.data["linked_invoice"])

        create_revenue_recognition = self.client.post(
            "/api/v1/finance/revenue-recognition/",
            {
                "project": project_id,
                "entry_number": "REV-API-001",
                "method": "percentage_of_completion",
                "recognition_date": str(date.today()),
                "progress_billing": progress_billing_id,
            },
            format="json",
        )
        self.assertEqual(create_revenue_recognition.status_code, status.HTTP_201_CREATED)
        revenue_entry_id = create_revenue_recognition.data["id"]

        submit_revenue_recognition = self.client.post(
            f"/api/v1/finance/revenue-recognition/{revenue_entry_id}/submit/",
            {},
            format="json",
        )
        self.assertEqual(submit_revenue_recognition.status_code, status.HTTP_200_OK)
        self.assertEqual(submit_revenue_recognition.data["status"], "pending_approval")

        approve_revenue_recognition = self.client.post(
            f"/api/v1/finance/revenue-recognition/{revenue_entry_id}/approve/",
            {},
            format="json",
        )
        self.assertEqual(approve_revenue_recognition.status_code, status.HTTP_200_OK)
        self.assertEqual(approve_revenue_recognition.data["status"], "approved")
        self.assertEqual(approve_revenue_recognition.data["recognized_amount"], "100.00")

        self._assert_paginated_response(self.client.get("/api/v1/finance/accounts/"))
        self._assert_paginated_response(self.client.get("/api/v1/finance/journal-entries/"))
        self._assert_paginated_response(self.client.get("/api/v1/finance/invoices/"))
        self._assert_paginated_response(self.client.get("/api/v1/finance/payments/"))
        self._assert_paginated_response(self.client.get("/api/v1/finance/progress-billings/"))
        self._assert_paginated_response(self.client.get("/api/v1/finance/revenue-recognition/"))

    def test_procurement_endpoints_contract(self):
        self.client.force_authenticate(user=self.project_manager_user)

        create_project = self.client.post(
            "/api/v1/projects/projects/",
            {
                "code": "PRJ-PROC-API-001",
                "name": "Procurement Endpoint Project",
                "client_name": "ACME",
                "budget": "200000.00",
                "contract_value": "250000.00",
            },
            format="json",
        )
        self.assertEqual(create_project.status_code, status.HTTP_201_CREATED)
        project_id = create_project.data["id"]

        create_cost_code = self.client.post(
            "/api/v1/projects/cost-codes/",
            {
                "project": project_id,
                "code": "CC-PROC-API-001",
                "name": "Material Purchases",
            },
            format="json",
        )
        self.assertEqual(create_cost_code.status_code, status.HTTP_201_CREATED)
        cost_code_id = create_cost_code.data["id"]

        create_supplier = self.client.post(
            "/api/v1/procurement/suppliers/",
            {"code": "SUP-API-001", "name": "Contract Supplier"},
            format="json",
        )
        self.assertEqual(create_supplier.status_code, status.HTTP_201_CREATED)
        supplier_id = create_supplier.data["id"]

        create_warehouse = self.client.post(
            "/api/v1/procurement/warehouses/",
            {"code": "WH-001", "name": "Main Warehouse"},
            format="json",
        )
        self.assertEqual(create_warehouse.status_code, status.HTTP_201_CREATED)
        warehouse_id = create_warehouse.data["id"]

        create_material = self.client.post(
            "/api/v1/procurement/materials/",
            {"sku": "MAT-API-001", "name": "Cement", "unit": "bag", "preferred_supplier": supplier_id},
            format="json",
        )
        self.assertEqual(create_material.status_code, status.HTTP_201_CREATED)
        material_id = create_material.data["id"]

        create_purchase_request = self.client.post(
            "/api/v1/procurement/purchase-requests/",
            {
                "request_number": "PR-API-001",
                "project": project_id,
                "items": [
                    {
                        "material": material_id,
                        "description": "Cement bags",
                        "quantity": "5.000",
                        "estimated_unit_cost": "20.00",
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(create_purchase_request.status_code, status.HTTP_201_CREATED)
        purchase_request_id = create_purchase_request.data["id"]

        submit_purchase_request = self.client.post(
            f"/api/v1/procurement/purchase-requests/{purchase_request_id}/submit/",
            {},
            format="json",
        )
        self.assertEqual(submit_purchase_request.status_code, status.HTTP_200_OK)
        self.assertEqual(submit_purchase_request.data["status"], "pending_approval")

        approve_purchase_request = self.client.post(
            f"/api/v1/procurement/purchase-requests/{purchase_request_id}/approve/",
            {},
            format="json",
        )
        self.assertEqual(approve_purchase_request.status_code, status.HTTP_200_OK)
        self.assertEqual(approve_purchase_request.data["status"], "approved")

        create_purchase_order = self.client.post(
            "/api/v1/procurement/purchase-orders/",
            {
                "order_number": "PO-API-001",
                "purchase_request": purchase_request_id,
                "supplier": supplier_id,
                "project": project_id,
                "order_date": str(date.today()),
                "items": [
                    {
                        "cost_code": cost_code_id,
                        "material": material_id,
                        "description": "Cement bags",
                        "quantity": "5.000",
                        "unit_cost": "20.00",
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(create_purchase_order.status_code, status.HTTP_201_CREATED)
        purchase_order_id = create_purchase_order.data["id"]
        purchase_order_item_id = create_purchase_order.data["items"][0]["id"]

        send_purchase_order = self.client.post(
            f"/api/v1/procurement/purchase-orders/{purchase_order_id}/send/",
            {},
            format="json",
        )
        self.assertEqual(send_purchase_order.status_code, status.HTTP_200_OK)
        self.assertEqual(send_purchase_order.data["status"], "sent")

        project_cost_summary = self.client.get(f"/api/v1/projects/projects/{project_id}/cost-summary/")
        self.assertEqual(project_cost_summary.status_code, status.HTTP_200_OK)
        self.assertEqual(project_cost_summary.data["totals"]["commitments"], "115.00")

        receive_purchase_order = self.client.post(
            f"/api/v1/procurement/purchase-orders/{purchase_order_id}/receive/",
            {"items": [{"item_id": purchase_order_item_id, "quantity": "5.000"}]},
            format="json",
        )
        self.assertEqual(receive_purchase_order.status_code, status.HTTP_200_OK)
        self.assertEqual(receive_purchase_order.data["status"], "received")

        create_stock_transaction = self.client.post(
            "/api/v1/procurement/stock-transactions/",
            {
                "material": material_id,
                "warehouse": warehouse_id,
                "transaction_type": "in",
                "quantity": "5.000",
                "unit_cost": "20.00",
                "transaction_date": str(date.today()),
                "reference_type": "purchase_order",
                "reference_id": str(purchase_order_id),
            },
            format="json",
        )
        self.assertEqual(create_stock_transaction.status_code, status.HTTP_201_CREATED)
        self.assertEqual(create_stock_transaction.data["transaction_type"], "in")

        self._assert_paginated_response(self.client.get("/api/v1/procurement/suppliers/"))
        self._assert_paginated_response(self.client.get("/api/v1/procurement/warehouses/"))
        self._assert_paginated_response(self.client.get("/api/v1/procurement/materials/"))
        self._assert_paginated_response(self.client.get("/api/v1/procurement/purchase-requests/"))
        self._assert_paginated_response(self.client.get("/api/v1/procurement/purchase-orders/"))
        self._assert_paginated_response(self.client.get("/api/v1/procurement/stock-transactions/"))
