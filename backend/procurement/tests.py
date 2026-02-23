from datetime import date

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import Role
from .models import Supplier
from projects.models import CostCode, Project, ProjectCostRecord


class TestProcurementApi(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="proc", password="pass1234")
        self.other_user = get_user_model().objects.create_user(username="proc-other", password="pass1234")
        self.approver = get_user_model().objects.create_superuser(
            username="proc-admin",
            email="proc-admin@example.com",
            password="pass1234",
        )
        self.client.force_authenticate(user=self.user)
        self.supplier = Supplier.objects.create(code="SUP-001", name="Alfa Supplies")

    def test_create_purchase_order_and_calculate_totals(self):
        material_response = self.client.post(
            "/api/v1/procurement/materials/",
            {"sku": "MAT-001", "name": "Cement", "unit": "bag"},
            format="json",
        )
        self.assertEqual(material_response.status_code, status.HTTP_201_CREATED)
        material_id = material_response.data["id"]

        payload = {
            "order_number": "PO-0001",
            "supplier": self.supplier.id,
            "order_date": str(date.today()),
            "items": [
                {"material": material_id, "description": "Cement 42.5", "quantity": "100.000", "unit_cost": "20.00"}
            ],
        }
        response = self.client.post("/api/v1/procurement/purchase-orders/", payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["subtotal"], "2000.00")
        self.assertEqual(response.data["tax_amount"], "300.00")
        self.assertEqual(response.data["total_amount"], "2300.00")

    def test_row_level_scope_blocks_other_users_from_purchase_request(self):
        material_response = self.client.post(
            "/api/v1/procurement/materials/",
            {"sku": "MAT-ROW-001", "name": "Gravel", "unit": "m3"},
            format="json",
        )
        self.assertEqual(material_response.status_code, status.HTTP_201_CREATED)
        material_id = material_response.data["id"]

        create_request = self.client.post(
            "/api/v1/procurement/purchase-requests/",
            {
                "request_number": "PR-ROW-0001",
                "items": [
                    {
                        "material": material_id,
                        "description": "Road base material",
                        "quantity": "8.000",
                        "estimated_unit_cost": "150.00",
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(create_request.status_code, status.HTTP_201_CREATED)
        request_id = create_request.data["id"]

        self.client.force_authenticate(user=self.other_user)
        retrieve_request = self.client.get(f"/api/v1/procurement/purchase-requests/{request_id}/")
        self.assertEqual(retrieve_request.status_code, status.HTTP_404_NOT_FOUND)

    def test_purchase_request_approval_workflow(self):
        material_response = self.client.post(
            "/api/v1/procurement/materials/",
            {"sku": "MAT-002", "name": "Steel", "unit": "ton"},
            format="json",
        )
        self.assertEqual(material_response.status_code, status.HTTP_201_CREATED)
        material_id = material_response.data["id"]

        create_request_payload = {
            "request_number": "PR-0001",
            "items": [
                {
                    "material": material_id,
                    "description": "Rebar steel",
                    "quantity": "5.000",
                    "estimated_unit_cost": "3000.00",
                }
            ],
        }
        create_request = self.client.post(
            "/api/v1/procurement/purchase-requests/",
            create_request_payload,
            format="json",
        )
        self.assertEqual(create_request.status_code, status.HTTP_201_CREATED)
        request_id = create_request.data["id"]

        submit_request = self.client.post(
            f"/api/v1/procurement/purchase-requests/{request_id}/submit/",
            {},
            format="json",
        )
        self.assertEqual(submit_request.status_code, status.HTTP_200_OK)
        self.assertEqual(submit_request.data["status"], "pending_approval")

        approve_without_permission = self.client.post(
            f"/api/v1/procurement/purchase-requests/{request_id}/approve/",
            {},
            format="json",
        )
        self.assertEqual(approve_without_permission.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(user=self.approver)
        approve_request = self.client.post(
            f"/api/v1/procurement/purchase-requests/{request_id}/approve/",
            {},
            format="json",
        )
        self.assertEqual(approve_request.status_code, status.HTTP_200_OK)
        self.assertEqual(approve_request.data["status"], "approved")

    def test_purchase_order_send_receive_workflow(self):
        material_response = self.client.post(
            "/api/v1/procurement/materials/",
            {"sku": "MAT-PO-001", "name": "Blocks", "unit": "pcs"},
            format="json",
        )
        self.assertEqual(material_response.status_code, status.HTTP_201_CREATED)
        material_id = material_response.data["id"]

        create_request = self.client.post(
            "/api/v1/procurement/purchase-requests/",
            {
                "request_number": "PR-PO-0001",
                "items": [
                    {
                        "material": material_id,
                        "description": "Concrete blocks",
                        "quantity": "10.000",
                        "estimated_unit_cost": "8.00",
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(create_request.status_code, status.HTTP_201_CREATED)
        request_id = create_request.data["id"]

        submit_request = self.client.post(
            f"/api/v1/procurement/purchase-requests/{request_id}/submit/",
            {},
            format="json",
        )
        self.assertEqual(submit_request.status_code, status.HTTP_200_OK)

        self.client.force_authenticate(user=self.approver)
        approve_request = self.client.post(
            f"/api/v1/procurement/purchase-requests/{request_id}/approve/",
            {},
            format="json",
        )
        self.assertEqual(approve_request.status_code, status.HTTP_200_OK)
        self.assertEqual(approve_request.data["status"], "approved")

        self.client.force_authenticate(user=self.user)
        create_order = self.client.post(
            "/api/v1/procurement/purchase-orders/",
            {
                "order_number": "PO-WF-0001",
                "purchase_request": request_id,
                "supplier": self.supplier.id,
                "order_date": str(date.today()),
                "items": [
                    {
                        "material": material_id,
                        "description": "Concrete blocks - batch A",
                        "quantity": "10.000",
                        "unit_cost": "8.00",
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(create_order.status_code, status.HTTP_201_CREATED)
        order_id = create_order.data["id"]
        order_item_id = create_order.data["items"][0]["id"]

        receive_before_send = self.client.post(
            f"/api/v1/procurement/purchase-orders/{order_id}/receive/",
            {"items": [{"item_id": order_item_id, "quantity": "2.000"}]},
            format="json",
        )
        self.assertEqual(receive_before_send.status_code, status.HTTP_400_BAD_REQUEST)

        send_order = self.client.post(f"/api/v1/procurement/purchase-orders/{order_id}/send/", {}, format="json")
        self.assertEqual(send_order.status_code, status.HTTP_200_OK)
        self.assertEqual(send_order.data["status"], "sent")

        update_after_send = self.client.patch(
            f"/api/v1/procurement/purchase-orders/{order_id}/",
            {"expected_date": str(date.today())},
            format="json",
        )
        self.assertEqual(update_after_send.status_code, status.HTTP_400_BAD_REQUEST)

        purchase_request_after_send = self.client.get(f"/api/v1/procurement/purchase-requests/{request_id}/")
        self.assertEqual(purchase_request_after_send.status_code, status.HTTP_200_OK)
        self.assertEqual(purchase_request_after_send.data["status"], "ordered")

        partial_receive = self.client.post(
            f"/api/v1/procurement/purchase-orders/{order_id}/receive/",
            {"items": [{"item_id": order_item_id, "quantity": "4.000"}]},
            format="json",
        )
        self.assertEqual(partial_receive.status_code, status.HTTP_200_OK)
        self.assertEqual(partial_receive.data["status"], "partially_received")
        self.assertEqual(partial_receive.data["items"][0]["received_quantity"], "4.000")

        over_receive = self.client.post(
            f"/api/v1/procurement/purchase-orders/{order_id}/receive/",
            {"items": [{"item_id": order_item_id, "quantity": "7.000"}]},
            format="json",
        )
        self.assertEqual(over_receive.status_code, status.HTTP_400_BAD_REQUEST)

        full_receive = self.client.post(
            f"/api/v1/procurement/purchase-orders/{order_id}/receive/",
            {"items": [{"item_id": order_item_id, "quantity": "6.000"}]},
            format="json",
        )
        self.assertEqual(full_receive.status_code, status.HTTP_200_OK)
        self.assertEqual(full_receive.data["status"], "received")
        self.assertEqual(full_receive.data["items"][0]["received_quantity"], "10.000")

        self.client.force_authenticate(user=self.approver)
        cancel_received = self.client.post(f"/api/v1/procurement/purchase-orders/{order_id}/cancel/", {}, format="json")
        self.assertEqual(cancel_received.status_code, status.HTTP_400_BAD_REQUEST)

    def test_purchase_order_cancel_blocks_further_transitions(self):
        material_response = self.client.post(
            "/api/v1/procurement/materials/",
            {"sku": "MAT-PO-002", "name": "Paint", "unit": "ltr"},
            format="json",
        )
        self.assertEqual(material_response.status_code, status.HTTP_201_CREATED)
        material_id = material_response.data["id"]

        create_order = self.client.post(
            "/api/v1/procurement/purchase-orders/",
            {
                "order_number": "PO-WF-0002",
                "supplier": self.supplier.id,
                "order_date": str(date.today()),
                "items": [
                    {
                        "material": material_id,
                        "description": "Exterior paint",
                        "quantity": "12.000",
                        "unit_cost": "25.00",
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(create_order.status_code, status.HTTP_201_CREATED)
        order_id = create_order.data["id"]
        order_item_id = create_order.data["items"][0]["id"]

        send_order = self.client.post(f"/api/v1/procurement/purchase-orders/{order_id}/send/", {}, format="json")
        self.assertEqual(send_order.status_code, status.HTTP_200_OK)
        self.assertEqual(send_order.data["status"], "sent")

        self.client.force_authenticate(user=self.approver)
        cancel_order = self.client.post(f"/api/v1/procurement/purchase-orders/{order_id}/cancel/", {}, format="json")
        self.assertEqual(cancel_order.status_code, status.HTTP_200_OK)
        self.assertEqual(cancel_order.data["status"], "cancelled")

        receive_after_cancel = self.client.post(
            f"/api/v1/procurement/purchase-orders/{order_id}/receive/",
            {"items": [{"item_id": order_item_id, "quantity": "1.000"}]},
            format="json",
        )
        self.assertEqual(receive_after_cancel.status_code, status.HTTP_400_BAD_REQUEST)

        send_after_cancel = self.client.post(f"/api/v1/procurement/purchase-orders/{order_id}/send/", {}, format="json")
        self.assertEqual(send_after_cancel.status_code, status.HTTP_400_BAD_REQUEST)

    def test_purchase_order_send_blocks_non_procurement_roles(self):
        material_response = self.client.post(
            "/api/v1/procurement/materials/",
            {"sku": "MAT-PO-003", "name": "Cable", "unit": "roll"},
            format="json",
        )
        self.assertEqual(material_response.status_code, status.HTTP_201_CREATED)
        material_id = material_response.data["id"]

        create_order = self.client.post(
            "/api/v1/procurement/purchase-orders/",
            {
                "order_number": "PO-WF-0003",
                "supplier": self.supplier.id,
                "order_date": str(date.today()),
                "items": [
                    {
                        "material": material_id,
                        "description": "Power cable",
                        "quantity": "3.000",
                        "unit_cost": "200.00",
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(create_order.status_code, status.HTTP_201_CREATED)
        order_id = create_order.data["id"]

        accountant_role, _ = Role.objects.get_or_create(slug="accountant", defaults={"name": "Accountant"})
        accountant_user = get_user_model().objects.create_user(
            username="proc-accountant",
            password="pass1234",
            role=accountant_role,
        )
        self.client.force_authenticate(user=accountant_user)
        send_as_accountant = self.client.post(
            f"/api/v1/procurement/purchase-orders/{order_id}/send/",
            {},
            format="json",
        )
        self.assertEqual(send_as_accountant.status_code, status.HTTP_403_FORBIDDEN)

    def test_purchase_order_send_creates_project_commitment_cost_record(self):
        project = Project.objects.create(
            code="PRJ-PROC-COST-001",
            name="Procurement Cost Project",
            client_name="ACME",
            created_by=self.user,
        )
        cost_code = CostCode.objects.create(
            project=project,
            code="CC-PROC-001",
            name="Material Purchases",
        )

        material_response = self.client.post(
            "/api/v1/procurement/materials/",
            {"sku": "MAT-COST-001", "name": "Bricks", "unit": "pcs"},
            format="json",
        )
        self.assertEqual(material_response.status_code, status.HTTP_201_CREATED)
        material_id = material_response.data["id"]

        create_order = self.client.post(
            "/api/v1/procurement/purchase-orders/",
            {
                "order_number": "PO-COST-0001",
                "supplier": self.supplier.id,
                "project": project.id,
                "cost_code": cost_code.id,
                "order_date": str(date.today()),
                "items": [
                    {
                        "material": material_id,
                        "description": "Bricks",
                        "quantity": "10.000",
                        "unit_cost": "10.00",
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(create_order.status_code, status.HTTP_201_CREATED)
        order_id = create_order.data["id"]

        self.assertEqual(
            ProjectCostRecord.objects.filter(
                source_module="procurement.purchase_order",
                source_reference="PO-COST-0001",
            ).count(),
            0,
        )

        send_order = self.client.post(f"/api/v1/procurement/purchase-orders/{order_id}/send/", {}, format="json")
        self.assertEqual(send_order.status_code, status.HTTP_200_OK)

        synced_cost_record = ProjectCostRecord.objects.get(
            source_module="procurement.purchase_order",
            source_reference="PO-COST-0001",
        )
        self.assertEqual(synced_cost_record.project_id, project.id)
        self.assertEqual(synced_cost_record.cost_code_id, cost_code.id)
        self.assertEqual(synced_cost_record.record_type, "commitment")
        self.assertEqual(str(synced_cost_record.amount), "115.00")

    def test_purchase_order_uses_item_cost_code_when_header_missing(self):
        project = Project.objects.create(
            code="PRJ-PROC-COST-002",
            name="Procurement Item Cost Project",
            client_name="ACME",
            created_by=self.user,
        )
        cost_code = CostCode.objects.create(
            project=project,
            code="CC-PROC-002",
            name="Concrete Materials",
        )

        material_response = self.client.post(
            "/api/v1/procurement/materials/",
            {"sku": "MAT-COST-002", "name": "Sand", "unit": "m3"},
            format="json",
        )
        self.assertEqual(material_response.status_code, status.HTTP_201_CREATED)
        material_id = material_response.data["id"]

        create_order = self.client.post(
            "/api/v1/procurement/purchase-orders/",
            {
                "order_number": "PO-COST-0002",
                "supplier": self.supplier.id,
                "project": project.id,
                "order_date": str(date.today()),
                "items": [
                    {
                        "cost_code": cost_code.id,
                        "material": material_id,
                        "description": "Sand",
                        "quantity": "10.000",
                        "unit_cost": "10.00",
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(create_order.status_code, status.HTTP_201_CREATED)
        self.assertEqual(create_order.data["cost_code"], cost_code.id)
        order_id = create_order.data["id"]

        send_order = self.client.post(f"/api/v1/procurement/purchase-orders/{order_id}/send/", {}, format="json")
        self.assertEqual(send_order.status_code, status.HTTP_200_OK)

        synced_cost_record = ProjectCostRecord.objects.get(
            source_module="procurement.purchase_order",
            source_reference="PO-COST-0002",
        )
        self.assertEqual(synced_cost_record.cost_code_id, cost_code.id)
        self.assertEqual(str(synced_cost_record.amount), "115.00")

    def test_cancel_purchase_order_settles_commitment_cost_record(self):
        project = Project.objects.create(
            code="PRJ-PROC-COST-003",
            name="Procurement Cancel Project",
            client_name="ACME",
            created_by=self.user,
        )
        cost_code = CostCode.objects.create(
            project=project,
            code="CC-PROC-003",
            name="Steel Supply",
        )

        material_response = self.client.post(
            "/api/v1/procurement/materials/",
            {"sku": "MAT-COST-003", "name": "Steel", "unit": "ton"},
            format="json",
        )
        self.assertEqual(material_response.status_code, status.HTTP_201_CREATED)
        material_id = material_response.data["id"]

        create_order = self.client.post(
            "/api/v1/procurement/purchase-orders/",
            {
                "order_number": "PO-COST-0003",
                "supplier": self.supplier.id,
                "project": project.id,
                "cost_code": cost_code.id,
                "order_date": str(date.today()),
                "items": [
                    {
                        "material": material_id,
                        "description": "Steel",
                        "quantity": "2.000",
                        "unit_cost": "100.00",
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(create_order.status_code, status.HTTP_201_CREATED)
        order_id = create_order.data["id"]

        send_order = self.client.post(f"/api/v1/procurement/purchase-orders/{order_id}/send/", {}, format="json")
        self.assertEqual(send_order.status_code, status.HTTP_200_OK)

        commitment_record = ProjectCostRecord.objects.get(
            source_module="procurement.purchase_order",
            source_reference="PO-COST-0003",
        )
        self.assertEqual(str(commitment_record.amount), "230.00")

        self.client.force_authenticate(user=self.approver)
        cancel_order = self.client.post(f"/api/v1/procurement/purchase-orders/{order_id}/cancel/", {}, format="json")
        self.assertEqual(cancel_order.status_code, status.HTTP_200_OK)

        commitment_record.refresh_from_db()
        self.assertEqual(str(commitment_record.amount), "0.00")

    def test_closed_project_blocks_procurement_documents(self):
        project = Project.objects.create(
            code="PRJ-PROC-CLOSED-001",
            name="Closed Procurement Project",
            client_name="ACME",
            status="completed",
            created_by=self.user,
        )
        cost_code = CostCode.objects.create(
            project=project,
            code="CC-PROC-CLOSED-001",
            name="Closed Cost",
        )

        material_response = self.client.post(
            "/api/v1/procurement/materials/",
            {"sku": "MAT-CLOSED-001", "name": "Closed Material", "unit": "pcs"},
            format="json",
        )
        self.assertEqual(material_response.status_code, status.HTTP_201_CREATED)
        material_id = material_response.data["id"]

        create_request = self.client.post(
            "/api/v1/procurement/purchase-requests/",
            {
                "request_number": "PR-CLOSED-001",
                "project": project.id,
                "items": [
                    {
                        "material": material_id,
                        "description": "Closed request",
                        "quantity": "1.000",
                        "estimated_unit_cost": "10.00",
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(create_request.status_code, status.HTTP_400_BAD_REQUEST)

        create_order = self.client.post(
            "/api/v1/procurement/purchase-orders/",
            {
                "order_number": "PO-CLOSED-001",
                "supplier": self.supplier.id,
                "project": project.id,
                "cost_code": cost_code.id,
                "order_date": str(date.today()),
                "items": [
                    {
                        "material": material_id,
                        "description": "Closed order",
                        "quantity": "1.000",
                        "unit_cost": "10.00",
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(create_order.status_code, status.HTTP_400_BAD_REQUEST)

        create_warehouse = self.client.post(
            "/api/v1/procurement/warehouses/",
            {"code": "WH-CLOSED-001", "name": "Closed Warehouse"},
            format="json",
        )
        self.assertEqual(create_warehouse.status_code, status.HTTP_201_CREATED)

        create_stock_transaction = self.client.post(
            "/api/v1/procurement/stock-transactions/",
            {
                "material": material_id,
                "warehouse": create_warehouse.data["id"],
                "project": project.id,
                "transaction_type": "in",
                "quantity": "1.000",
                "unit_cost": "10.00",
                "transaction_date": str(date.today()),
            },
            format="json",
        )
        self.assertEqual(create_stock_transaction.status_code, status.HTTP_400_BAD_REQUEST)
