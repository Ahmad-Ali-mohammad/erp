from datetime import date
from io import BytesIO

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from openpyxl import Workbook

from core.models import Role
from .models import Account, Invoice
from projects.models import CostCode, Project, ProjectCostRecord


class TestFinanceApi(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="acc", password="pass1234")
        self.other_user = get_user_model().objects.create_user(username="other", password="pass1234")
        self.approver = get_user_model().objects.create_superuser(
            username="finance-admin",
            email="finance-admin@example.com",
            password="pass1234",
        )
        self.client.force_authenticate(user=self.user)
        self.account1 = Account.objects.create(code="1110", name="Cash", account_type="asset")
        self.account2 = Account.objects.create(code="4100", name="Revenue", account_type="revenue")

    def test_create_balanced_journal_entry(self):
        payload = {
            "entry_number": "JE-0001",
            "entry_date": str(date.today()),
            "description": "Test entry",
            "status": "draft",
            "lines": [
                {"account": self.account1.id, "debit": "1000.00", "credit": "0.00"},
                {"account": self.account2.id, "debit": "0.00", "credit": "1000.00"},
            ],
        }
        response = self.client.post("/api/v1/finance/journal-entries/", payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_reject_unbalanced_journal_entry(self):
        payload = {
            "entry_number": "JE-0002",
            "entry_date": str(date.today()),
            "description": "Unbalanced",
            "status": "draft",
            "lines": [
                {"account": self.account1.id, "debit": "1000.00", "credit": "0.00"},
                {"account": self.account2.id, "debit": "0.00", "credit": "900.00"},
            ],
        }
        response = self.client.post("/api/v1/finance/journal-entries/", payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_row_level_scope_blocks_other_users_from_invoice(self):
        invoice_payload = {
            "invoice_number": "INV-ROW-0001",
            "invoice_type": "customer",
            "partner_name": "Scoped Partner",
            "issue_date": str(date.today()),
            "items": [
                {
                    "description": "Scoped billing",
                    "quantity": "1.000",
                    "unit_price": "1000.00",
                    "tax_rate": "15.00",
                }
            ],
        }
        create_invoice = self.client.post("/api/v1/finance/invoices/", invoice_payload, format="json")
        self.assertEqual(create_invoice.status_code, status.HTTP_201_CREATED)
        invoice_id = create_invoice.data["id"]

        self.client.force_authenticate(user=self.other_user)
        retrieve_invoice = self.client.get(f"/api/v1/finance/invoices/{invoice_id}/")
        self.assertEqual(retrieve_invoice.status_code, status.HTTP_404_NOT_FOUND)

    def test_action_matrix_blocks_non_finance_roles_from_account_creation(self):
        supervisor_role = Role.objects.create(name="Site Supervisor", slug="site-supervisor")
        supervisor_user = get_user_model().objects.create_user(
            username="site-supervisor",
            password="pass1234",
            role=supervisor_role,
        )
        self.client.force_authenticate(user=supervisor_user)

        payload = {
            "code": "1220",
            "name": "Bank - Restricted",
            "account_type": "asset",
        }
        response = self.client.post("/api/v1/finance/accounts/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_invoice_and_payment_approval_workflow(self):
        invoice_payload = {
            "invoice_number": "INV-0001",
            "invoice_type": "customer",
            "partner_name": "ACME",
            "issue_date": str(date.today()),
            "items": [
                {
                    "description": "Progress billing",
                    "quantity": "2.000",
                    "unit_price": "500.00",
                    "tax_rate": "15.00",
                }
            ],
        }
        create_invoice = self.client.post("/api/v1/finance/invoices/", invoice_payload, format="json")
        self.assertEqual(create_invoice.status_code, status.HTTP_201_CREATED)
        invoice_id = create_invoice.data["id"]

        submit_invoice = self.client.post(f"/api/v1/finance/invoices/{invoice_id}/submit/", {}, format="json")
        self.assertEqual(submit_invoice.status_code, status.HTTP_200_OK)
        self.assertEqual(submit_invoice.data["status"], "pending_approval")

        approve_without_permission = self.client.post(
            f"/api/v1/finance/invoices/{invoice_id}/approve/",
            {},
            format="json",
        )
        self.assertEqual(approve_without_permission.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(user=self.approver)
        approve_invoice = self.client.post(f"/api/v1/finance/invoices/{invoice_id}/approve/", {}, format="json")
        self.assertEqual(approve_invoice.status_code, status.HTTP_200_OK)
        self.assertEqual(approve_invoice.data["status"], "issued")

        self.client.force_authenticate(user=self.user)
        payment_one_payload = {
            "invoice": invoice_id,
            "payment_date": str(date.today()),
            "amount": "500.00",
            "method": "bank_transfer",
        }
        create_payment_one = self.client.post("/api/v1/finance/payments/", payment_one_payload, format="json")
        self.assertEqual(create_payment_one.status_code, status.HTTP_201_CREATED)
        payment_one_id = create_payment_one.data["id"]

        submit_payment_one = self.client.post(f"/api/v1/finance/payments/{payment_one_id}/submit/", {}, format="json")
        self.assertEqual(submit_payment_one.status_code, status.HTTP_200_OK)

        self.client.force_authenticate(user=self.approver)
        approve_payment_one = self.client.post(
            f"/api/v1/finance/payments/{payment_one_id}/approve/",
            {},
            format="json",
        )
        self.assertEqual(approve_payment_one.status_code, status.HTTP_200_OK)
        self.assertEqual(approve_payment_one.data["status"], "confirmed")

        invoice_after_first_payment = self.client.get(f"/api/v1/finance/invoices/{invoice_id}/")
        self.assertEqual(invoice_after_first_payment.status_code, status.HTTP_200_OK)
        self.assertEqual(invoice_after_first_payment.data["status"], "partially_paid")

        self.client.force_authenticate(user=self.user)
        payment_two_payload = {
            "invoice": invoice_id,
            "payment_date": str(date.today()),
            "amount": "650.00",
            "method": "bank_transfer",
        }
        create_payment_two = self.client.post("/api/v1/finance/payments/", payment_two_payload, format="json")
        self.assertEqual(create_payment_two.status_code, status.HTTP_201_CREATED)
        payment_two_id = create_payment_two.data["id"]

        submit_payment_two = self.client.post(f"/api/v1/finance/payments/{payment_two_id}/submit/", {}, format="json")
        self.assertEqual(submit_payment_two.status_code, status.HTTP_200_OK)

        self.client.force_authenticate(user=self.approver)
        approve_payment_two = self.client.post(
            f"/api/v1/finance/payments/{payment_two_id}/approve/",
            {},
            format="json",
        )
        self.assertEqual(approve_payment_two.status_code, status.HTTP_200_OK)

        invoice_after_second_payment = self.client.get(f"/api/v1/finance/invoices/{invoice_id}/")
        self.assertEqual(invoice_after_second_payment.status_code, status.HTTP_200_OK)
        self.assertEqual(invoice_after_second_payment.data["status"], "paid")

    def test_supplier_invoice_approval_creates_project_actual_cost_record(self):
        project = Project.objects.create(
            code="PRJ-FIN-COST-001",
            name="Finance Cost Project",
            client_name="ACME",
            created_by=self.user,
        )
        cost_code = CostCode.objects.create(
            project=project,
            code="CC-FIN-001",
            name="Subcontract Works",
        )

        invoice_payload = {
            "invoice_number": "INV-SUP-001",
            "invoice_type": "supplier",
            "project": project.id,
            "cost_code": cost_code.id,
            "partner_name": "Supplier One",
            "issue_date": str(date.today()),
            "items": [
                {
                    "description": "Supplier billing",
                    "quantity": "2.000",
                    "unit_price": "500.00",
                    "tax_rate": "15.00",
                }
            ],
        }
        create_invoice = self.client.post("/api/v1/finance/invoices/", invoice_payload, format="json")
        self.assertEqual(create_invoice.status_code, status.HTTP_201_CREATED)
        invoice_id = create_invoice.data["id"]

        submit_invoice = self.client.post(f"/api/v1/finance/invoices/{invoice_id}/submit/", {}, format="json")
        self.assertEqual(submit_invoice.status_code, status.HTTP_200_OK)

        self.assertEqual(
            ProjectCostRecord.objects.filter(source_module="finance.invoice", source_reference="INV-SUP-001").count(),
            0,
        )

        self.client.force_authenticate(user=self.approver)
        approve_invoice = self.client.post(f"/api/v1/finance/invoices/{invoice_id}/approve/", {}, format="json")
        self.assertEqual(approve_invoice.status_code, status.HTTP_200_OK)

        synced_cost_record = ProjectCostRecord.objects.get(
            source_module="finance.invoice",
            source_reference="INV-SUP-001",
        )
        self.assertEqual(synced_cost_record.project_id, project.id)
        self.assertEqual(synced_cost_record.cost_code_id, cost_code.id)
        self.assertEqual(synced_cost_record.record_type, "actual")
        self.assertEqual(str(synced_cost_record.amount), "1150.00")

    def test_supplier_invoice_uses_item_cost_code_when_header_missing(self):
        project = Project.objects.create(
            code="PRJ-FIN-COST-002",
            name="Finance Item Cost Project",
            client_name="ACME",
            created_by=self.user,
        )
        cost_code = CostCode.objects.create(
            project=project,
            code="CC-FIN-002",
            name="Material Supply",
        )

        create_invoice = self.client.post(
            "/api/v1/finance/invoices/",
            {
                "invoice_number": "INV-SUP-002",
                "invoice_type": "supplier",
                "partner_name": "Supplier Two",
                "issue_date": str(date.today()),
                "items": [
                    {
                        "cost_code": cost_code.id,
                        "description": "Supply billing",
                        "quantity": "1.000",
                        "unit_price": "1000.00",
                        "tax_rate": "15.00",
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(create_invoice.status_code, status.HTTP_201_CREATED)
        invoice_id = create_invoice.data["id"]
        self.assertEqual(create_invoice.data["project"], project.id)
        self.assertEqual(create_invoice.data["cost_code"], cost_code.id)

        submit_invoice = self.client.post(f"/api/v1/finance/invoices/{invoice_id}/submit/", {}, format="json")
        self.assertEqual(submit_invoice.status_code, status.HTTP_200_OK)

        self.client.force_authenticate(user=self.approver)
        approve_invoice = self.client.post(f"/api/v1/finance/invoices/{invoice_id}/approve/", {}, format="json")
        self.assertEqual(approve_invoice.status_code, status.HTTP_200_OK)

        synced_cost_record = ProjectCostRecord.objects.get(
            source_module="finance.invoice",
            source_reference="INV-SUP-002",
        )
        self.assertEqual(synced_cost_record.project_id, project.id)
        self.assertEqual(synced_cost_record.cost_code_id, cost_code.id)
        self.assertEqual(str(synced_cost_record.amount), "1150.00")

    def test_reject_invoice_settles_existing_actual_cost_record(self):
        project = Project.objects.create(
            code="PRJ-FIN-COST-003",
            name="Finance Reject Project",
            client_name="ACME",
            created_by=self.user,
        )
        cost_code = CostCode.objects.create(
            project=project,
            code="CC-FIN-003",
            name="Temporary Cost",
        )

        create_invoice = self.client.post(
            "/api/v1/finance/invoices/",
            {
                "invoice_number": "INV-SUP-003",
                "invoice_type": "supplier",
                "project": project.id,
                "cost_code": cost_code.id,
                "partner_name": "Supplier Three",
                "issue_date": str(date.today()),
                "items": [
                    {
                        "description": "Service billing",
                        "quantity": "1.000",
                        "unit_price": "100.00",
                        "tax_rate": "15.00",
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(create_invoice.status_code, status.HTTP_201_CREATED)
        invoice_id = create_invoice.data["id"]

        stale_record = ProjectCostRecord.objects.create(
            project=project,
            cost_code=cost_code,
            record_type="actual",
            amount="115.00",
            record_date=date.today(),
            source_module="finance.invoice",
            source_reference="INV-SUP-003",
            created_by=self.user,
        )
        self.assertEqual(str(stale_record.amount), "115.00")

        submit_invoice = self.client.post(f"/api/v1/finance/invoices/{invoice_id}/submit/", {}, format="json")
        self.assertEqual(submit_invoice.status_code, status.HTTP_200_OK)

        self.client.force_authenticate(user=self.approver)
        reject_invoice = self.client.post(
            f"/api/v1/finance/invoices/{invoice_id}/reject/",
            {"reason": "Invalid supporting documents"},
            format="json",
        )
        self.assertEqual(reject_invoice.status_code, status.HTTP_200_OK)

        stale_record.refresh_from_db()
        self.assertEqual(str(stale_record.amount), "0.00")

    def test_progress_billing_approval_uses_latest_contract_value_after_change_order(self):
        project = Project.objects.create(
            code="PRJ-FIN-PB-001",
            name="Progress Billing Project",
            client_name="ACME",
            contract_value="1000.00",
            budget="1000.00",
            created_by=self.user,
        )
        cost_code = CostCode.objects.create(
            project=project,
            code="CC-FIN-PB-001",
            name="Variation Works",
        )

        create_change_order = self.client.post(
            "/api/v1/projects/change-orders/",
            {
                "project": project.id,
                "order_number": "CO-FIN-PB-001",
                "title": "Contract uplift",
                "lines": [
                    {
                        "cost_code": cost_code.id,
                        "description": "Additional work",
                        "contract_value_delta": "200.00",
                        "budget_delta": "50.00",
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

        self.client.force_authenticate(user=self.approver)
        approve_change_order = self.client.post(
            f"/api/v1/projects/change-orders/{change_order_id}/approve/",
            {},
            format="json",
        )
        self.assertEqual(approve_change_order.status_code, status.HTTP_200_OK)
        self.client.force_authenticate(user=self.user)

        create_billing = self.client.post(
            "/api/v1/finance/progress-billings/",
            {
                "project": project.id,
                "billing_number": "PB-001",
                "billing_date": str(date.today()),
                "completion_percentage": "10.00",
                "tax_rate": "15.00",
            },
            format="json",
        )
        self.assertEqual(create_billing.status_code, status.HTTP_201_CREATED)
        billing_id = create_billing.data["id"]

        submit_billing = self.client.post(
            f"/api/v1/finance/progress-billings/{billing_id}/submit/",
            {},
            format="json",
        )
        self.assertEqual(submit_billing.status_code, status.HTTP_200_OK)
        self.assertEqual(submit_billing.data["status"], "pending_approval")

        self.client.force_authenticate(user=self.approver)
        approve_billing = self.client.post(
            f"/api/v1/finance/progress-billings/{billing_id}/approve/",
            {},
            format="json",
        )
        self.assertEqual(approve_billing.status_code, status.HTTP_200_OK)
        self.assertEqual(approve_billing.data["status"], "approved")
        self.assertEqual(approve_billing.data["contract_value_snapshot"], "1200.00")
        self.assertEqual(approve_billing.data["subtotal"], "120.00")
        self.assertEqual(approve_billing.data["tax_amount"], "18.00")
        self.assertEqual(approve_billing.data["total_amount"], "138.00")

    def test_progress_billing_generate_invoice_marks_billing_invoiced(self):
        project = Project.objects.create(
            code="PRJ-FIN-PB-002",
            name="Progress Billing Invoicing Project",
            client_name="ACME",
            contract_value="1000.00",
            budget="800.00",
            created_by=self.user,
        )

        create_billing = self.client.post(
            "/api/v1/finance/progress-billings/",
            {
                "project": project.id,
                "billing_number": "PB-002",
                "billing_date": str(date.today()),
                "completion_percentage": "10.00",
                "tax_rate": "15.00",
            },
            format="json",
        )
        self.assertEqual(create_billing.status_code, status.HTTP_201_CREATED)
        billing_id = create_billing.data["id"]

        submit_billing = self.client.post(
            f"/api/v1/finance/progress-billings/{billing_id}/submit/",
            {},
            format="json",
        )
        self.assertEqual(submit_billing.status_code, status.HTTP_200_OK)

        self.client.force_authenticate(user=self.approver)
        approve_billing = self.client.post(
            f"/api/v1/finance/progress-billings/{billing_id}/approve/",
            {},
            format="json",
        )
        self.assertEqual(approve_billing.status_code, status.HTTP_200_OK)

        self.client.force_authenticate(user=self.user)
        generate_invoice = self.client.post(
            f"/api/v1/finance/progress-billings/{billing_id}/generate-invoice/",
            {},
            format="json",
        )
        self.assertEqual(generate_invoice.status_code, status.HTTP_200_OK)
        self.assertEqual(generate_invoice.data["status"], "invoiced")
        self.assertIsNotNone(generate_invoice.data["linked_invoice"])

        invoice = Invoice.objects.get(id=generate_invoice.data["linked_invoice"])
        self.assertEqual(invoice.invoice_type, "customer")
        self.assertEqual(invoice.project_id, project.id)
        self.assertEqual(str(invoice.total_amount), "115.00")
        self.assertEqual(invoice.items.count(), 1)

    def test_progress_billing_blocks_over_billing_contract_value(self):
        project = Project.objects.create(
            code="PRJ-FIN-PB-003",
            name="Progress Billing Cap Project",
            client_name="ACME",
            contract_value="1000.00",
            budget="800.00",
            created_by=self.user,
        )

        create_first = self.client.post(
            "/api/v1/finance/progress-billings/",
            {
                "project": project.id,
                "billing_number": "PB-003-1",
                "billing_date": str(date.today()),
                "completion_percentage": "60.00",
                "tax_rate": "15.00",
            },
            format="json",
        )
        self.assertEqual(create_first.status_code, status.HTTP_201_CREATED)
        first_id = create_first.data["id"]
        self.assertEqual(
            self.client.post(f"/api/v1/finance/progress-billings/{first_id}/submit/", {}, format="json").status_code,
            status.HTTP_200_OK,
        )

        self.client.force_authenticate(user=self.approver)
        approve_first = self.client.post(f"/api/v1/finance/progress-billings/{first_id}/approve/", {}, format="json")
        self.assertEqual(approve_first.status_code, status.HTTP_200_OK)
        self.client.force_authenticate(user=self.user)

        create_second = self.client.post(
            "/api/v1/finance/progress-billings/",
            {
                "project": project.id,
                "billing_number": "PB-003-2",
                "billing_date": str(date.today()),
                "completion_percentage": "60.00",
                "tax_rate": "15.00",
            },
            format="json",
        )
        self.assertEqual(create_second.status_code, status.HTTP_201_CREATED)
        second_id = create_second.data["id"]
        self.assertEqual(
            self.client.post(f"/api/v1/finance/progress-billings/{second_id}/submit/", {}, format="json").status_code,
            status.HTTP_200_OK,
        )

        self.client.force_authenticate(user=self.approver)
        approve_second = self.client.post(f"/api/v1/finance/progress-billings/{second_id}/approve/", {}, format="json")
        self.assertEqual(approve_second.status_code, status.HTTP_400_BAD_REQUEST)

    def test_revenue_recognition_from_progress_billing_and_contract_cap(self):
        project = Project.objects.create(
            code="PRJ-FIN-REV-001",
            name="Revenue Recognition Project",
            client_name="ACME",
            contract_value="1000.00",
            budget="900.00",
            created_by=self.user,
        )

        create_billing = self.client.post(
            "/api/v1/finance/progress-billings/",
            {
                "project": project.id,
                "billing_number": "PB-REV-001",
                "billing_date": str(date.today()),
                "completion_percentage": "20.00",
                "tax_rate": "15.00",
            },
            format="json",
        )
        self.assertEqual(create_billing.status_code, status.HTTP_201_CREATED)
        billing_id = create_billing.data["id"]

        self.assertEqual(
            self.client.post(f"/api/v1/finance/progress-billings/{billing_id}/submit/", {}, format="json").status_code,
            status.HTTP_200_OK,
        )
        self.client.force_authenticate(user=self.approver)
        self.assertEqual(
            self.client.post(f"/api/v1/finance/progress-billings/{billing_id}/approve/", {}, format="json").status_code,
            status.HTTP_200_OK,
        )
        self.client.force_authenticate(user=self.user)

        create_entry = self.client.post(
            "/api/v1/finance/revenue-recognition/",
            {
                "project": project.id,
                "entry_number": "REV-001",
                "method": "percentage_of_completion",
                "recognition_date": str(date.today()),
                "progress_billing": billing_id,
            },
            format="json",
        )
        self.assertEqual(create_entry.status_code, status.HTTP_201_CREATED)
        entry_id = create_entry.data["id"]

        submit_entry = self.client.post(f"/api/v1/finance/revenue-recognition/{entry_id}/submit/", {}, format="json")
        self.assertEqual(submit_entry.status_code, status.HTTP_200_OK)

        self.client.force_authenticate(user=self.approver)
        approve_entry = self.client.post(f"/api/v1/finance/revenue-recognition/{entry_id}/approve/", {}, format="json")
        self.assertEqual(approve_entry.status_code, status.HTTP_200_OK)
        self.assertEqual(approve_entry.data["status"], "approved")
        self.assertEqual(approve_entry.data["recognized_amount"], "200.00")

        self.client.force_authenticate(user=self.user)
        create_entry_over = self.client.post(
            "/api/v1/finance/revenue-recognition/",
            {
                "project": project.id,
                "entry_number": "REV-002",
                "method": "percentage_of_completion",
                "recognition_date": str(date.today()),
                "recognized_percentage": "90.00",
            },
            format="json",
        )
        self.assertEqual(create_entry_over.status_code, status.HTTP_201_CREATED)
        over_id = create_entry_over.data["id"]
        self.assertEqual(
            self.client.post(f"/api/v1/finance/revenue-recognition/{over_id}/submit/", {}, format="json").status_code,
            status.HTTP_200_OK,
        )

        self.client.force_authenticate(user=self.approver)
        approve_over = self.client.post(f"/api/v1/finance/revenue-recognition/{over_id}/approve/", {}, format="json")
        self.assertEqual(approve_over.status_code, status.HTTP_400_BAD_REQUEST)

    def test_completed_contract_revenue_recognition_recognizes_remaining_value(self):
        project = Project.objects.create(
            code="PRJ-FIN-REV-002",
            name="Completed Contract Revenue Project",
            client_name="ACME",
            status="completed",
            contract_value="1000.00",
            budget="900.00",
            created_by=self.user,
        )

        create_entry = self.client.post(
            "/api/v1/finance/revenue-recognition/",
            {
                "project": project.id,
                "entry_number": "REV-COMP-001",
                "method": "completed_contract",
                "recognition_date": str(date.today()),
            },
            format="json",
        )
        self.assertEqual(create_entry.status_code, status.HTTP_201_CREATED)
        entry_id = create_entry.data["id"]

        submit_entry = self.client.post(f"/api/v1/finance/revenue-recognition/{entry_id}/submit/", {}, format="json")
        self.assertEqual(submit_entry.status_code, status.HTTP_200_OK)

        self.client.force_authenticate(user=self.approver)
        approve_entry = self.client.post(f"/api/v1/finance/revenue-recognition/{entry_id}/approve/", {}, format="json")
        self.assertEqual(approve_entry.status_code, status.HTTP_200_OK)
        self.assertEqual(approve_entry.data["recognized_amount"], "1000.00")
        self.assertEqual(approve_entry.data["recognized_percentage"], "100.00")

        self.client.force_authenticate(user=self.user)
        create_second = self.client.post(
            "/api/v1/finance/revenue-recognition/",
            {
                "project": project.id,
                "entry_number": "REV-COMP-002",
                "method": "completed_contract",
                "recognition_date": str(date.today()),
            },
            format="json",
        )
        self.assertEqual(create_second.status_code, status.HTTP_201_CREATED)
        second_id = create_second.data["id"]
        self.assertEqual(
            self.client.post(f"/api/v1/finance/revenue-recognition/{second_id}/submit/", {}, format="json").status_code,
            status.HTTP_200_OK,
        )

        self.client.force_authenticate(user=self.approver)
        approve_second = self.client.post(
            f"/api/v1/finance/revenue-recognition/{second_id}/approve/",
            {},
            format="json",
        )
        self.assertEqual(approve_second.status_code, status.HTTP_400_BAD_REQUEST)

    def test_closed_project_blocks_finance_documents(self):
        project = Project.objects.create(
            code="PRJ-FIN-CLOSED-001",
            name="Closed Finance Project",
            client_name="ACME",
            status="completed",
            created_by=self.user,
        )
        cost_code = CostCode.objects.create(
            project=project,
            code="CC-FIN-CLOSED-001",
            name="Closed Cost Code",
        )

        create_invoice = self.client.post(
            "/api/v1/finance/invoices/",
            {
                "invoice_number": "INV-CLOSED-001",
                "invoice_type": "supplier",
                "project": project.id,
                "cost_code": cost_code.id,
                "partner_name": "Closed Supplier",
                "issue_date": str(date.today()),
                "items": [
                    {
                        "description": "Closed billing",
                        "quantity": "1.000",
                        "unit_price": "100.00",
                        "tax_rate": "15.00",
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(create_invoice.status_code, status.HTTP_400_BAD_REQUEST)

        create_entry = self.client.post(
            "/api/v1/finance/journal-entries/",
            {
                "entry_number": "JE-CLOSED-001",
                "entry_date": str(date.today()),
                "description": "Closed project entry",
                "project": project.id,
                "lines": [
                    {"account": self.account1.id, "debit": "100.00", "credit": "0.00"},
                    {"account": self.account2.id, "debit": "0.00", "credit": "100.00"},
                ],
            },
            format="json",
        )
        self.assertEqual(create_entry.status_code, status.HTTP_400_BAD_REQUEST)


class TestJournalEntryExcel(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="excel-user", password="pass1234")
        self.client.force_authenticate(user=self.user)
        self.account1 = Account.objects.create(code="1100", name="Cash", account_type="asset")
        self.account2 = Account.objects.create(code="2100", name="Revenue", account_type="revenue")

    def _build_workbook(self, rows):
        headers = [
            "entry_number",
            "entry_date",
            "entry_class",
            "description",
            "currency",
            "fx_rate_to_base",
            "project_id",
            "account_code",
            "account_id",
            "debit",
            "credit",
            "line_description",
        ]
        workbook = Workbook()
        sheet = workbook.active
        sheet.append(headers)
        for row in rows:
            sheet.append(row)
        output = BytesIO()
        workbook.save(output)
        output.seek(0)
        return output

    def test_export_journal_entries_excel(self):
        payload = {
            "entry_number": "JE-EXCEL-001",
            "entry_date": str(date.today()),
            "description": "Excel export test",
            "status": "draft",
            "lines": [
                {"account": self.account1.id, "debit": "100.00", "credit": "0.00"},
                {"account": self.account2.id, "debit": "0.00", "credit": "100.00"},
            ],
        }
        create_entry = self.client.post("/api/v1/finance/journal-entries/", payload, format="json")
        self.assertEqual(create_entry.status_code, status.HTTP_201_CREATED)

        response = self.client.get("/api/v1/finance/journal-entries/export/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", response["Content-Type"])

    def test_import_journal_entries_excel(self):
        rows = [
            [
                "JE-EXCEL-IMP-001",
                str(date.today()),
                "manual",
                "Import entry",
                "KWD",
                "1.00000000",
                "",
                self.account1.code,
                "",
                "150.00",
                "0.00",
                "Debit line",
            ],
            [
                "JE-EXCEL-IMP-001",
                str(date.today()),
                "manual",
                "Import entry",
                "KWD",
                "1.00000000",
                "",
                self.account2.code,
                "",
                "0.00",
                "150.00",
                "Credit line",
            ],
        ]
        workbook = self._build_workbook(rows)
        response = self.client.post(
            "/api/v1/finance/journal-entries/import/",
            {"file": workbook},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["created_count"], 1)

    def test_import_journal_entries_excel_rejects_unbalanced(self):
        rows = [
            [
                "JE-EXCEL-IMP-002",
                str(date.today()),
                "manual",
                "Import entry",
                "KWD",
                "1.00000000",
                "",
                self.account1.code,
                "",
                "100.00",
                "0.00",
                "Debit line",
            ],
            [
                "JE-EXCEL-IMP-002",
                str(date.today()),
                "manual",
                "Import entry",
                "KWD",
                "1.00000000",
                "",
                self.account2.code,
                "",
                "0.00",
                "50.00",
                "Credit line",
            ],
        ]
        workbook = self._build_workbook(rows)
        response = self.client.post(
            "/api/v1/finance/journal-entries/import/",
            {"file": workbook},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
