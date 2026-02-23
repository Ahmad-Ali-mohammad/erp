from __future__ import annotations

from datetime import date
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APITestCase

from erp_v2.models import GLEntry, GLEntryLine, InventoryLocation, InventoryMovement, MasterCustomer, MasterItem, MasterVendor, SalesInvoice
from erp_v2.services import ensure_default_accounts
from finance.models import FiscalPeriod


class TestErpV2Api(APITestCase):
    def setUp(self):
        User = get_user_model()
        self.maker = User.objects.create_superuser(
            username="erpv2-maker",
            email="erpv2-maker@example.com",
            password="pass1234",
        )
        self.checker = User.objects.create_superuser(
            username="erpv2-checker",
            email="erpv2-checker@example.com",
            password="pass1234",
        )
        self.client.force_authenticate(user=self.maker)
        ensure_default_accounts()

    def _as_maker(self):
        self.client.force_authenticate(user=self.maker)

    def _as_checker(self):
        self.client.force_authenticate(user=self.checker)

    def test_health_endpoint(self):
        response = self.client.get("/api/v2/health/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "ok")

    def test_kpis_endpoint(self):
        response = self.client.get("/api/v2/reports/kpis/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("masters", response.data)

    def test_sales_credit_invoice_post_generates_4_gl_lines(self):
        customer = MasterCustomer.objects.create(code="CUST-1", name="Customer 1")
        item = MasterItem.objects.create(sku="SKU-SALES-1", name="Item 1", standard_cost="10.00", sales_price="25.00", track_inventory=False)
        create_invoice = self.client.post(
            "/api/v2/sales/invoices/",
            {
                "invoice_type": "credit",
                "customer": customer.id,
                "invoice_date": str(date.today()),
                "lines": [{"item": item.id, "quantity": "2.000", "unit_price": "25.00"}],
            },
            format="json",
        )
        self.assertEqual(create_invoice.status_code, status.HTTP_201_CREATED)

        self._as_checker()
        post_invoice = self.client.post(f"/api/v2/sales/invoices/{create_invoice.data['id']}/post/", {}, format="json")
        self.assertEqual(post_invoice.status_code, status.HTTP_200_OK)
        invoice = SalesInvoice.objects.get(pk=create_invoice.data["id"])
        self.assertEqual(invoice.status, SalesInvoice.Status.POSTED)

        entry = GLEntry.objects.get(source_type="sales_invoice", source_id=str(invoice.id))
        self.assertEqual(entry.lines.count(), 4)
        total_debit = sum((line.debit for line in entry.lines.all()), Decimal("0.00"))
        total_credit = sum((line.credit for line in entry.lines.all()), Decimal("0.00"))
        self.assertEqual(total_debit, total_credit)

    def test_pos_checkout_posts_invoice_and_moves_stock(self):
        customer = MasterCustomer.objects.create(code="CUST-2", name="Cash Customer")
        item = MasterItem.objects.create(sku="SKU-POS-1", name="POS Item", standard_cost="10.00", sales_price="20.00")
        location = InventoryLocation.objects.create(code="LOC-1", name="Main")
        InventoryMovement.objects.create(
            item=item,
            location=location,
            movement_type=InventoryMovement.MovementType.IN,
            quantity=Decimal("5.000"),
            unit_cost=Decimal("10.00"),
            movement_date=date.today(),
            reference_type="seed",
            reference_id="1",
        )

        response = self.client.post(
            "/api/v2/sales/pos/checkout/",
            {
                "customer": customer.id,
                "location": location.id,
                "lines": [{"item": item.id, "quantity": "2.000", "unit_price": "20.00"}],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], "posted")
        self.assertEqual(response.data["invoice_type"], "cash")
        self.assertEqual(str(response.data["total_amount"]), "40.00")
        outbound = InventoryMovement.objects.filter(reference_type="sales_invoice", movement_type=InventoryMovement.MovementType.OUT).count()
        self.assertEqual(outbound, 1)

    def test_receive_grn_then_purchase_invoice_payment_overpay_blocked(self):
        vendor = MasterVendor.objects.create(code="V-1", name="Vendor 1")
        item = MasterItem.objects.create(sku="SKU-PI-1", name="Purchase Item", standard_cost="5.00", sales_price="8.00")
        location = InventoryLocation.objects.create(code="LOC-2", name="Secondary")

        create_po = self.client.post(
            "/api/v2/purchase/orders/",
            {
                "vendor": vendor.id,
                "order_date": str(date.today()),
                "lines": [{"item": item.id, "quantity": "3.000", "unit_cost": "5.00"}],
            },
            format="json",
        )
        self.assertEqual(create_po.status_code, status.HTTP_201_CREATED)
        po_id = create_po.data["id"]
        po_line_id = create_po.data["lines"][0]["id"]

        receive = self.client.post(
            f"/api/v2/purchase/orders/{po_id}/receive/",
            {"location": location.id, "lines": [{"line_id": po_line_id, "quantity": "3.000"}]},
            format="json",
        )
        self.assertEqual(receive.status_code, status.HTTP_200_OK)

        in_movements = InventoryMovement.objects.filter(reference_type="purchase_receipt", movement_type=InventoryMovement.MovementType.IN).count()
        self.assertEqual(in_movements, 1)

        create_pi = self.client.post(
            "/api/v2/purchase/invoices/",
            {
                "vendor": vendor.id,
                "purchase_order": po_id,
                "invoice_date": str(date.today()),
                "lines": [{"item": item.id, "quantity": "3.000", "unit_cost": "5.00"}],
            },
            format="json",
        )
        self.assertEqual(create_pi.status_code, status.HTTP_201_CREATED)

        self._as_checker()
        post_pi = self.client.post(f"/api/v2/purchase/invoices/{create_pi.data['id']}/post/", {}, format="json")
        self.assertEqual(post_pi.status_code, status.HTTP_200_OK)

        # Purchase invoice posting should not create extra stock movement.
        self.assertEqual(
            InventoryMovement.objects.filter(reference_type="purchase_receipt", movement_type=InventoryMovement.MovementType.IN).count(),
            1,
        )

        overpay = self.client.post(
            "/api/v2/treasury/payments/",
            {
                "vendor": vendor.id,
                "purchase_invoice": create_pi.data["id"],
                "payment_date": str(date.today()),
                "amount": "999.00",
                "channel": "cash",
            },
            format="json",
        )
        self.assertEqual(overpay.status_code, status.HTTP_400_BAD_REQUEST)

    def test_overpayment_blocked_for_receipt(self):
        customer = MasterCustomer.objects.create(code="CUST-3", name="Customer 3")
        item = MasterItem.objects.create(sku="SKU-AR-1", name="Service", standard_cost="1.00", sales_price="10.00", track_inventory=False)

        create_invoice = self.client.post(
            "/api/v2/sales/invoices/",
            {
                "invoice_type": "credit",
                "customer": customer.id,
                "invoice_date": str(date.today()),
                "lines": [{"item": item.id, "quantity": "1.000", "unit_price": "10.00"}],
            },
            format="json",
        )
        self.assertEqual(create_invoice.status_code, status.HTTP_201_CREATED)

        self._as_checker()
        post_invoice = self.client.post(f"/api/v2/sales/invoices/{create_invoice.data['id']}/post/", {}, format="json")
        self.assertEqual(post_invoice.status_code, status.HTTP_200_OK)

        overpay = self.client.post(
            "/api/v2/treasury/receipts/",
            {
                "customer": customer.id,
                "sales_invoice": create_invoice.data["id"],
                "receipt_date": str(date.today()),
                "amount": "99.00",
                "channel": "cash",
            },
            format="json",
        )
        self.assertEqual(overpay.status_code, status.HTTP_400_BAD_REQUEST)

    def test_post_manual_gl_entry_rejects_unbalanced_and_hard_close(self):
        accounts = ensure_default_accounts()
        entry = GLEntry.objects.create(
            entry_number="MAN-UNBAL-1",
            entry_date=date.today(),
            source_type="manual",
            source_id="1",
            created_by=self.maker,
        )
        GLEntryLine.objects.create(entry=entry, account=accounts["cash"], debit=Decimal("10.00"), credit=Decimal("0.00"))
        GLEntryLine.objects.create(entry=entry, account=accounts["sales"], debit=Decimal("0.00"), credit=Decimal("9.00"))
        self._as_checker()
        post_unbalanced = self.client.post(f"/api/v2/gl/journal-entries/{entry.id}/post/", {}, format="json")
        self.assertEqual(post_unbalanced.status_code, status.HTTP_400_BAD_REQUEST)

        closed_entry = GLEntry.objects.create(
            entry_number="MAN-CLOSE-1",
            entry_date=date.today(),
            source_type="manual",
            source_id="2",
            created_by=self.maker,
        )
        GLEntryLine.objects.create(entry=closed_entry, account=accounts["cash"], debit=Decimal("10.00"), credit=Decimal("0.00"))
        GLEntryLine.objects.create(entry=closed_entry, account=accounts["sales"], debit=Decimal("0.00"), credit=Decimal("10.00"))

        FiscalPeriod.objects.create(
            year=date.today().year,
            month=date.today().month,
            start_date=date.today().replace(day=1),
            end_date=date.today(),
            status=FiscalPeriod.Status.HARD_CLOSED,
        )
        post_closed = self.client.post(f"/api/v2/gl/journal-entries/{closed_entry.id}/post/", {}, format="json")
        self.assertEqual(post_closed.status_code, status.HTTP_400_BAD_REQUEST)

    def test_maker_checker_blocked_on_sales_invoice_post(self):
        customer = MasterCustomer.objects.create(code="CUST-MC", name="MC Customer")
        item = MasterItem.objects.create(sku="SKU-MC", name="MC Item", standard_cost="1.00", sales_price="10.00", track_inventory=False)
        invoice = self.client.post(
            "/api/v2/sales/invoices/",
            {
                "invoice_type": "credit",
                "customer": customer.id,
                "invoice_date": str(date.today()),
                "lines": [{"item": item.id, "quantity": "1.000", "unit_price": "10.00"}],
            },
            format="json",
        )
        self.assertEqual(invoice.status_code, status.HTTP_201_CREATED)

        # Same maker cannot post.
        self._as_maker()
        blocked = self.client.post(f"/api/v2/sales/invoices/{invoice.data['id']}/post/", {}, format="json")
        self.assertEqual(blocked.status_code, status.HTTP_400_BAD_REQUEST)

    def test_bank_csv_import_and_reconciliation(self):
        customer = MasterCustomer.objects.create(code="CUST-4", name="Customer 4")
        item = MasterItem.objects.create(sku="SKU-BNK-1", name="Bank Item", standard_cost="1.00", sales_price="50.00", track_inventory=False)
        invoice = self.client.post(
            "/api/v2/sales/invoices/",
            {
                "invoice_type": "credit",
                "customer": customer.id,
                "invoice_date": str(date.today()),
                "lines": [{"item": item.id, "quantity": "1.000", "unit_price": "50.00"}],
            },
            format="json",
        )
        self.assertEqual(invoice.status_code, status.HTTP_201_CREATED)
        self._as_checker()
        self.client.post(f"/api/v2/sales/invoices/{invoice.data['id']}/post/", {}, format="json")
        receipt = self.client.post(
            "/api/v2/treasury/receipts/",
            {
                "customer": customer.id,
                "sales_invoice": invoice.data["id"],
                "receipt_date": str(date.today()),
                "amount": "50.00",
                "channel": "bank",
            },
            format="json",
        )
        self.assertEqual(receipt.status_code, status.HTTP_201_CREATED)

        csv_payload = "date,description,reference,amount\n{d},Receipt,BNK-1,50.00\n{d},Other,BNK-2,7.00\n".format(
            d=str(date.today())
        )
        upload = SimpleUploadedFile("statement.csv", csv_payload.encode("utf-8"), content_type="text/csv")
        statement_resp = self.client.post(
            "/api/v2/banking/statements/import-csv/",
            {"file": upload},
            format="multipart",
        )
        self.assertEqual(statement_resp.status_code, status.HTTP_201_CREATED)
        statement_id = statement_resp.data["id"]

        reconcile = self.client.post("/api/v2/banking/reconciliations/run/", {"statement": statement_id}, format="json")
        self.assertEqual(reconcile.status_code, status.HTTP_200_OK)
        self.assertEqual(reconcile.data["matched_count"], 1)
        self.assertEqual(reconcile.data["unmatched_count"], 1)

    def test_trial_balance_balanced_after_postings(self):
        customer = MasterCustomer.objects.create(code="CUST-5", name="Customer 5")
        item = MasterItem.objects.create(sku="SKU-TB-1", name="TB Item", standard_cost="1.00", sales_price="10.00", track_inventory=False)
        invoice = self.client.post(
            "/api/v2/sales/invoices/",
            {
                "invoice_type": "credit",
                "customer": customer.id,
                "invoice_date": str(date.today()),
                "lines": [{"item": item.id, "quantity": "2.000", "unit_price": "10.00"}],
            },
            format="json",
        )
        self.assertEqual(invoice.status_code, status.HTTP_201_CREATED)
        self._as_checker()
        posted = self.client.post(f"/api/v2/sales/invoices/{invoice.data['id']}/post/", {}, format="json")
        self.assertEqual(posted.status_code, status.HTTP_200_OK)

        tb = self.client.get("/api/v2/reports/trial-balance/")
        self.assertEqual(tb.status_code, status.HTTP_200_OK)
        self.assertTrue(tb.data["totals"]["is_balanced"])

    def test_strict_mode_requires_posting_rule(self):
        customer = MasterCustomer.objects.create(code="CUST-STRICT", name="Strict Customer")
        item = MasterItem.objects.create(sku="SKU-STRICT", name="Strict Item", standard_cost="1.00", sales_price="10.00", track_inventory=False)
        invoice = self.client.post(
            "/api/v2/sales/invoices/",
            {
                "invoice_type": "credit",
                "customer": customer.id,
                "invoice_date": str(date.today()),
                "lines": [{"item": item.id, "quantity": "1.000", "unit_price": "10.00"}],
            },
            format="json",
        )
        self.assertEqual(invoice.status_code, status.HTTP_201_CREATED)

        # Remove posting rule then enforce strict mode.
        from erp_v2.models import PostingRule

        PostingRule.objects.filter(source_type="sales_invoice").delete()
        self._as_checker()
        with patch.dict("os.environ", {"POSTING_V2_MODE": "strict"}):
            blocked = self.client.post(f"/api/v2/sales/invoices/{invoice.data['id']}/post/", {}, format="json")
        self.assertEqual(blocked.status_code, status.HTTP_400_BAD_REQUEST)
