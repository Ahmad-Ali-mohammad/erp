from decimal import Decimal

from rest_framework import serializers

from core.services.sequence import next_sequence

from .models import (
    BankReconciliationSession,
    BankStatement,
    BankStatementLine,
    CostCenter,
    GLEntry,
    GLEntryLine,
    GLAccount,
    InventoryAdjustment,
    InventoryCountSession,
    InventoryLocation,
    InventoryMovement,
    MasterCustomer,
    MasterItem,
    MasterVendor,
    PostingRule,
    PostingRuleLine,
    PurchaseInvoice,
    PurchaseInvoiceLine,
    PurchaseOrder,
    PurchaseOrderLine,
    PurchaseReceipt,
    PurchaseReceiptLine,
    SalesInvoice,
    SalesInvoiceLine,
    SalesOrder,
    SalesOrderLine,
    SalesQuotation,
    SalesQuotationLine,
    TreasuryCheque,
    TreasuryPayment,
    TreasuryReceipt,
)


def _next_doc_number(sequence_key: str, prefix: str) -> str:
    return next_sequence(sequence_key, prefix=prefix, padding=7)


class GLAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = GLAccount
        fields = "__all__"


class CostCenterSerializer(serializers.ModelSerializer):
    class Meta:
        model = CostCenter
        fields = "__all__"


class MasterCustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = MasterCustomer
        fields = "__all__"


class MasterVendorSerializer(serializers.ModelSerializer):
    class Meta:
        model = MasterVendor
        fields = "__all__"


class MasterItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = MasterItem
        fields = "__all__"


class InventoryLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = InventoryLocation
        fields = "__all__"


class InventoryMovementSerializer(serializers.ModelSerializer):
    class Meta:
        model = InventoryMovement
        fields = "__all__"


class SalesQuotationLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalesQuotationLine
        exclude = ["quotation"]


class SalesQuotationSerializer(serializers.ModelSerializer):
    lines = SalesQuotationLineSerializer(many=True, required=False)

    class Meta:
        model = SalesQuotation
        fields = "__all__"
        extra_kwargs = {"quotation_number": {"required": False}}

    def create(self, validated_data):
        lines = validated_data.pop("lines", [])
        if not validated_data.get("quotation_number"):
            validated_data["quotation_number"] = _next_doc_number("erp_v2_sales_quotation", "SQT-")
        obj = SalesQuotation.objects.create(**validated_data)
        for line in lines:
            SalesQuotationLine.objects.create(quotation=obj, **line)
        return obj

    def update(self, instance, validated_data):
        lines = validated_data.pop("lines", None)
        for key, val in validated_data.items():
            setattr(instance, key, val)
        instance.save()
        if lines is not None:
            instance.lines.all().delete()
            for line in lines:
                SalesQuotationLine.objects.create(quotation=instance, **line)
        return instance


class SalesOrderLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalesOrderLine
        exclude = ["order"]


class SalesOrderSerializer(serializers.ModelSerializer):
    lines = SalesOrderLineSerializer(many=True, required=False)

    class Meta:
        model = SalesOrder
        fields = "__all__"
        extra_kwargs = {"order_number": {"required": False}}

    def create(self, validated_data):
        lines = validated_data.pop("lines", [])
        if not validated_data.get("order_number"):
            validated_data["order_number"] = _next_doc_number("erp_v2_sales_order", "SOR-")
        obj = SalesOrder.objects.create(**validated_data)
        for line in lines:
            SalesOrderLine.objects.create(order=obj, **line)
        return obj

    def update(self, instance, validated_data):
        lines = validated_data.pop("lines", None)
        for key, val in validated_data.items():
            setattr(instance, key, val)
        instance.save()
        if lines is not None:
            instance.lines.all().delete()
            for line in lines:
                SalesOrderLine.objects.create(order=instance, **line)
        return instance


class SalesInvoiceLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalesInvoiceLine
        exclude = ["invoice"]


class SalesInvoiceSerializer(serializers.ModelSerializer):
    lines = SalesInvoiceLineSerializer(many=True, required=False)

    class Meta:
        model = SalesInvoice
        fields = "__all__"
        read_only_fields = ["created_by", "posted_by", "posted_at", "subtotal", "total_amount", "paid_amount", "status"]
        extra_kwargs = {"invoice_number": {"required": False}}

    def _calculate_totals(self, instance):
        subtotal = Decimal("0.00")
        for line in instance.lines.all():
            subtotal += line.quantity * line.unit_price
        instance.subtotal = subtotal
        instance.total_amount = subtotal + (instance.tax_amount or Decimal("0.00"))
        instance.save(update_fields=["subtotal", "total_amount", "updated_at"])

    def create(self, validated_data):
        lines = validated_data.pop("lines", [])
        if not validated_data.get("invoice_number"):
            validated_data["invoice_number"] = _next_doc_number("erp_v2_sales_invoice", "SIN-")
        obj = SalesInvoice.objects.create(**validated_data)
        for line in lines:
            SalesInvoiceLine.objects.create(invoice=obj, **line)
        self._calculate_totals(obj)
        return obj

    def update(self, instance, validated_data):
        lines = validated_data.pop("lines", None)
        for key, val in validated_data.items():
            setattr(instance, key, val)
        instance.save()
        if lines is not None:
            instance.lines.all().delete()
            for line in lines:
                SalesInvoiceLine.objects.create(invoice=instance, **line)
        self._calculate_totals(instance)
        return instance


class PurchaseOrderLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = PurchaseOrderLine
        exclude = ["order"]


class PurchaseOrderSerializer(serializers.ModelSerializer):
    lines = PurchaseOrderLineSerializer(many=True, required=False)

    class Meta:
        model = PurchaseOrder
        fields = "__all__"
        extra_kwargs = {"order_number": {"required": False}}

    def create(self, validated_data):
        lines = validated_data.pop("lines", [])
        if not validated_data.get("order_number"):
            validated_data["order_number"] = _next_doc_number("erp_v2_purchase_order", "POV2-")
        obj = PurchaseOrder.objects.create(**validated_data)
        for line in lines:
            PurchaseOrderLine.objects.create(order=obj, **line)
        return obj

    def update(self, instance, validated_data):
        lines = validated_data.pop("lines", None)
        for key, val in validated_data.items():
            setattr(instance, key, val)
        instance.save()
        if lines is not None:
            instance.lines.all().delete()
            for line in lines:
                PurchaseOrderLine.objects.create(order=instance, **line)
        return instance


class PurchaseReceiptLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = PurchaseReceiptLine
        exclude = ["receipt"]


class PurchaseReceiptSerializer(serializers.ModelSerializer):
    lines = PurchaseReceiptLineSerializer(many=True, required=False)

    class Meta:
        model = PurchaseReceipt
        fields = "__all__"
        extra_kwargs = {"receipt_number": {"required": False}}

    def create(self, validated_data):
        lines = validated_data.pop("lines", [])
        if not validated_data.get("receipt_number"):
            validated_data["receipt_number"] = _next_doc_number("erp_v2_purchase_receipt", "GRN-")
        obj = PurchaseReceipt.objects.create(**validated_data)
        for line in lines:
            PurchaseReceiptLine.objects.create(receipt=obj, **line)
        return obj

    def update(self, instance, validated_data):
        lines = validated_data.pop("lines", None)
        for key, val in validated_data.items():
            setattr(instance, key, val)
        instance.save()
        if lines is not None:
            instance.lines.all().delete()
            for line in lines:
                PurchaseReceiptLine.objects.create(receipt=instance, **line)
        return instance


class PurchaseInvoiceLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = PurchaseInvoiceLine
        exclude = ["invoice"]


class PurchaseInvoiceSerializer(serializers.ModelSerializer):
    lines = PurchaseInvoiceLineSerializer(many=True, required=False)

    class Meta:
        model = PurchaseInvoice
        fields = "__all__"
        read_only_fields = ["created_by", "posted_by", "posted_at", "subtotal", "total_amount", "paid_amount", "status"]
        extra_kwargs = {"invoice_number": {"required": False}}

    def _calculate_totals(self, instance):
        subtotal = Decimal("0.00")
        for line in instance.lines.all():
            subtotal += line.quantity * line.unit_cost
        instance.subtotal = subtotal
        instance.total_amount = subtotal + (instance.tax_amount or Decimal("0.00"))
        instance.save(update_fields=["subtotal", "total_amount", "updated_at"])

    def create(self, validated_data):
        lines = validated_data.pop("lines", [])
        if not validated_data.get("invoice_number"):
            validated_data["invoice_number"] = _next_doc_number("erp_v2_purchase_invoice", "PIN-")
        obj = PurchaseInvoice.objects.create(**validated_data)
        for line in lines:
            PurchaseInvoiceLine.objects.create(invoice=obj, **line)
        self._calculate_totals(obj)
        return obj

    def update(self, instance, validated_data):
        lines = validated_data.pop("lines", None)
        for key, val in validated_data.items():
            setattr(instance, key, val)
        instance.save()
        if lines is not None:
            instance.lines.all().delete()
            for line in lines:
                PurchaseInvoiceLine.objects.create(invoice=instance, **line)
        self._calculate_totals(instance)
        return instance


class TreasuryReceiptSerializer(serializers.ModelSerializer):
    class Meta:
        model = TreasuryReceipt
        fields = "__all__"
        extra_kwargs = {"receipt_number": {"required": False}}

    def create(self, validated_data):
        if not validated_data.get("receipt_number"):
            validated_data["receipt_number"] = _next_doc_number("erp_v2_treasury_receipt", "RCV-")
        return super().create(validated_data)


class TreasuryPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = TreasuryPayment
        fields = "__all__"
        extra_kwargs = {"payment_number": {"required": False}}

    def create(self, validated_data):
        if not validated_data.get("payment_number"):
            validated_data["payment_number"] = _next_doc_number("erp_v2_treasury_payment", "PAY-")
        return super().create(validated_data)


class TreasuryChequeSerializer(serializers.ModelSerializer):
    class Meta:
        model = TreasuryCheque
        fields = "__all__"


class GLEntryLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = GLEntryLine
        exclude = ["entry"]


class GLEntrySerializer(serializers.ModelSerializer):
    lines = GLEntryLineSerializer(many=True)

    class Meta:
        model = GLEntry
        fields = "__all__"
        read_only_fields = ["status", "posted_by", "posted_at", "created_by"]
        extra_kwargs = {"entry_number": {"required": False}}

    def validate(self, attrs):
        lines = attrs.get("lines") or (self.instance and [{"debit": l.debit, "credit": l.credit} for l in self.instance.lines.all()])
        debit = sum([Decimal(str(line.get("debit", 0))) for line in lines or []], Decimal("0.00"))
        credit = sum([Decimal(str(line.get("credit", 0))) for line in lines or []], Decimal("0.00"))
        if debit != credit:
            raise serializers.ValidationError({"lines": "Journal entry must be balanced."})
        return attrs

    def create(self, validated_data):
        lines = validated_data.pop("lines", [])
        if not validated_data.get("entry_number"):
            validated_data["entry_number"] = _next_doc_number("erp_v2_gl_entry", "GLV2-")
        obj = GLEntry.objects.create(**validated_data)
        for line in lines:
            GLEntryLine.objects.create(entry=obj, **line)
        return obj

    def update(self, instance, validated_data):
        lines = validated_data.pop("lines", None)
        for key, val in validated_data.items():
            setattr(instance, key, val)
        instance.save()
        if lines is not None:
            instance.lines.all().delete()
            for line in lines:
                GLEntryLine.objects.create(entry=instance, **line)
        return instance


class BankStatementLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = BankStatementLine
        exclude = ["statement"]


class BankStatementSerializer(serializers.ModelSerializer):
    lines = BankStatementLineSerializer(many=True, required=False)

    class Meta:
        model = BankStatement
        fields = "__all__"
        extra_kwargs = {"statement_number": {"required": False}}

    def create(self, validated_data):
        lines = validated_data.pop("lines", [])
        if not validated_data.get("statement_number"):
            validated_data["statement_number"] = _next_doc_number("erp_v2_bank_statement", "BST-")
        obj = BankStatement.objects.create(**validated_data)
        for line in lines:
            BankStatementLine.objects.create(statement=obj, **line)
        return obj

    def update(self, instance, validated_data):
        lines = validated_data.pop("lines", None)
        for key, val in validated_data.items():
            setattr(instance, key, val)
        instance.save()
        if lines is not None:
            instance.lines.all().delete()
            for line in lines:
                BankStatementLine.objects.create(statement=instance, **line)
        return instance


class BankReconciliationSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = BankReconciliationSession
        fields = "__all__"


class InventoryCountSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = InventoryCountSession
        fields = "__all__"
        extra_kwargs = {"session_number": {"required": False}}

    def create(self, validated_data):
        if not validated_data.get("session_number"):
            validated_data["session_number"] = _next_doc_number("erp_v2_inventory_count_session", "CNT-")
        return super().create(validated_data)


class InventoryAdjustmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = InventoryAdjustment
        fields = "__all__"
        extra_kwargs = {"adjustment_number": {"required": False}}

    def create(self, validated_data):
        if not validated_data.get("adjustment_number"):
            validated_data["adjustment_number"] = _next_doc_number("erp_v2_inventory_adjustment", "ADJ-")
        return super().create(validated_data)


class PostingRuleLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = PostingRuleLine
        exclude = ["rule"]


class PostingRuleSerializer(serializers.ModelSerializer):
    lines = PostingRuleLineSerializer(many=True, required=False)

    class Meta:
        model = PostingRule
        fields = "__all__"

    def create(self, validated_data):
        lines = validated_data.pop("lines", [])
        obj = PostingRule.objects.create(**validated_data)
        for line in lines:
            PostingRuleLine.objects.create(rule=obj, **line)
        return obj

    def update(self, instance, validated_data):
        lines = validated_data.pop("lines", None)
        for key, val in validated_data.items():
            setattr(instance, key, val)
        instance.save()
        if lines is not None:
            instance.lines.all().delete()
            for line in lines:
                PostingRuleLine.objects.create(rule=instance, **line)
        return instance
