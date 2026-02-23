from decimal import Decimal

from rest_framework import serializers

from projects.models import Project
from .models import (
    Account,
    BankAccount,
    BankReconciliationSession,
    BankStatement,
    BankStatementLine,
    ExchangeRate,
    FiscalPeriod,
    Invoice,
    InvoiceItem,
    JournalEntry,
    JournalLine,
    Payment,
    PostingRule,
    PostingRuleLine,
    ProgressBilling,
    PrintSettings,
    RecurringEntryTemplate,
    RecurringEntryTemplateLine,
    RevenueRecognitionEntry,
)
from .services.printing import next_invoice_number

LOCKED_PROJECT_STATUSES = {Project.Status.COMPLETED, Project.Status.CANCELLED}


def _ensure_project_is_open(project):
    if project and project.status in LOCKED_PROJECT_STATUSES:
        raise serializers.ValidationError({"project": "This project is closed and cannot be modified."})


class AccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = Account
        fields = [
            "id",
            "code",
            "name",
            "account_type",
            "report_group",
            "parent",
            "is_active",
            "is_control_account",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class JournalLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = JournalLine
        fields = [
            "id",
            "account",
            "description",
            "debit",
            "credit",
            "debit_foreign",
            "credit_foreign",
            "project",
            "cost_center_code",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class JournalEntrySerializer(serializers.ModelSerializer):
    lines = JournalLineSerializer(many=True)

    class Meta:
        model = JournalEntry
        fields = [
            "id",
            "entry_number",
            "entry_date",
            "description",
            "status",
            "entry_class",
            "source_module",
            "source_object_id",
            "source_event",
            "idempotency_key",
            "currency",
            "fx_rate_to_base",
            "period",
            "posted_at",
            "posted_by",
            "reversal_of",
            "correction_root",
            "project",
            "created_by",
            "lines",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_by", "posted_at", "posted_by", "created_at", "updated_at"]

    def validate(self, attrs):
        if self.instance and self.instance.status in {JournalEntry.Status.POSTED, JournalEntry.Status.REVERSED}:
            raise serializers.ValidationError("Posted or reversed journal entries cannot be modified.")

        project = attrs.get("project") or getattr(self.instance, "project", None)
        _ensure_project_is_open(project)

        lines = attrs.get("lines")
        if lines is None and self.instance:
            lines = [
                {
                    "debit": line.debit,
                    "credit": line.credit,
                }
                for line in self.instance.lines.all()
            ]

        debit_total = Decimal("0.00")
        credit_total = Decimal("0.00")

        for line in lines or []:
            debit_total += Decimal(line.get("debit", 0))
            credit_total += Decimal(line.get("credit", 0))

        if lines and debit_total != credit_total:
            raise serializers.ValidationError("Journal entry must be balanced (debit == credit).")

        period = attrs.get("period") or getattr(self.instance, "period", None)
        if period and period.status == FiscalPeriod.Status.HARD_CLOSED:
            raise serializers.ValidationError({"period": "Cannot create or update entries in a hard-closed period."})

        return attrs

    def create(self, validated_data):
        lines_data = validated_data.pop("lines", [])
        journal_entry = JournalEntry.objects.create(**validated_data)
        for line_data in lines_data:
            JournalLine.objects.create(entry=journal_entry, **line_data)
        return journal_entry

    def update(self, instance, validated_data):
        lines_data = validated_data.pop("lines", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if lines_data is not None:
            instance.lines.all().delete()
            for line_data in lines_data:
                JournalLine.objects.create(entry=instance, **line_data)

        return instance


class FiscalPeriodSerializer(serializers.ModelSerializer):
    class Meta:
        model = FiscalPeriod
        fields = [
            "id",
            "year",
            "month",
            "start_date",
            "end_date",
            "status",
            "soft_closed_at",
            "soft_closed_by",
            "hard_closed_at",
            "hard_closed_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "status",
            "soft_closed_at",
            "soft_closed_by",
            "hard_closed_at",
            "hard_closed_by",
            "created_at",
            "updated_at",
        ]


class ExchangeRateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExchangeRate
        fields = [
            "id",
            "from_currency",
            "to_currency",
            "rate_date",
            "rate",
            "notes",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_by", "created_at", "updated_at"]


class PrintSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = PrintSettings
        fields = [
            "id",
            "watermark_type",
            "watermark_text",
            "watermark_image_url",
            "watermark_opacity",
            "watermark_rotation",
            "watermark_scale",
            "invoice_prefix",
            "invoice_padding",
            "invoice_next_number",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

class PostingRuleLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = PostingRuleLine
        fields = [
            "id",
            "line_order",
            "account",
            "side",
            "amount_source",
            "fixed_amount",
            "description_template",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class PostingRuleSerializer(serializers.ModelSerializer):
    lines = PostingRuleLineSerializer(many=True, required=False)

    class Meta:
        model = PostingRule
        fields = [
            "id",
            "name",
            "source_module",
            "source_event",
            "description",
            "is_active",
            "posting_policy",
            "entry_class",
            "created_by",
            "lines",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_by", "created_at", "updated_at"]

    def create(self, validated_data):
        lines_data = validated_data.pop("lines", [])
        posting_rule = PostingRule.objects.create(**validated_data)
        for line_data in lines_data:
            PostingRuleLine.objects.create(posting_rule=posting_rule, **line_data)
        return posting_rule

    def update(self, instance, validated_data):
        lines_data = validated_data.pop("lines", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if lines_data is not None:
            instance.lines.all().delete()
            for line_data in lines_data:
                PostingRuleLine.objects.create(posting_rule=instance, **line_data)
        return instance


class RecurringEntryTemplateLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = RecurringEntryTemplateLine
        fields = [
            "id",
            "line_order",
            "account",
            "side",
            "amount",
            "description",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class RecurringEntryTemplateSerializer(serializers.ModelSerializer):
    lines = RecurringEntryTemplateLineSerializer(many=True, required=False)

    class Meta:
        model = RecurringEntryTemplate
        fields = [
            "id",
            "template_code",
            "name",
            "description",
            "frequency",
            "start_date",
            "next_run_date",
            "end_date",
            "currency",
            "auto_post",
            "is_active",
            "project",
            "created_by",
            "lines",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_by", "created_at", "updated_at"]

    def validate(self, attrs):
        project = attrs.get("project") or getattr(self.instance, "project", None)
        _ensure_project_is_open(project)
        return attrs

    def create(self, validated_data):
        lines_data = validated_data.pop("lines", [])
        template = RecurringEntryTemplate.objects.create(**validated_data)
        for line_data in lines_data:
            RecurringEntryTemplateLine.objects.create(template=template, **line_data)
        return template

    def update(self, instance, validated_data):
        lines_data = validated_data.pop("lines", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if lines_data is not None:
            instance.lines.all().delete()
            for line_data in lines_data:
                RecurringEntryTemplateLine.objects.create(template=instance, **line_data)
        return instance


class BankAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = BankAccount
        fields = [
            "id",
            "code",
            "name",
            "bank_name",
            "account_number",
            "currency",
            "gl_account",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class BankStatementLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = BankStatementLine
        fields = [
            "id",
            "line_date",
            "description",
            "reference",
            "amount",
            "is_reconciled",
            "matched_journal_line",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class BankStatementSerializer(serializers.ModelSerializer):
    lines = BankStatementLineSerializer(many=True, required=False)

    class Meta:
        model = BankStatement
        fields = [
            "id",
            "bank_account",
            "statement_date",
            "opening_balance",
            "closing_balance",
            "status",
            "notes",
            "uploaded_by",
            "lines",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["uploaded_by", "created_at", "updated_at"]

    def create(self, validated_data):
        lines_data = validated_data.pop("lines", [])
        statement = BankStatement.objects.create(**validated_data)
        for line_data in lines_data:
            BankStatementLine.objects.create(statement=statement, **line_data)
        return statement

    def update(self, instance, validated_data):
        lines_data = validated_data.pop("lines", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if lines_data is not None:
            instance.lines.all().delete()
            for line_data in lines_data:
                BankStatementLine.objects.create(statement=instance, **line_data)
        return instance


class BankReconciliationSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = BankReconciliationSession
        fields = [
            "id",
            "bank_account",
            "period",
            "status",
            "started_at",
            "started_by",
            "closed_at",
            "closed_by",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["started_at", "started_by", "closed_at", "closed_by", "created_at", "updated_at"]


class InvoiceItemSerializer(serializers.ModelSerializer):
    line_subtotal = serializers.DecimalField(max_digits=16, decimal_places=2, read_only=True)
    line_tax = serializers.DecimalField(max_digits=16, decimal_places=2, read_only=True)

    class Meta:
        model = InvoiceItem
        fields = [
            "id",
            "cost_code",
            "project_phase",
            "description",
            "quantity",
            "unit_price",
            "tax_rate",
            "line_subtotal",
            "line_tax",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at", "line_subtotal", "line_tax"]


class InvoiceSerializer(serializers.ModelSerializer):
    items = InvoiceItemSerializer(many=True, required=False)

    class Meta:
        model = Invoice
        fields = [
            "id",
            "invoice_number",
            "invoice_type",
            "status",
            "project",
            "cost_code",
            "customer",
            "partner_name",
            "issue_date",
            "due_date",
            "currency",
            "subtotal",
            "tax_amount",
            "total_amount",
            "notes",
            "created_by",
            "submitted_at",
            "submitted_by",
            "approved_at",
            "approved_by",
            "rejected_at",
            "rejected_by",
            "rejection_reason",
            "items",
            "created_at",
            "updated_at",
        ]
        extra_kwargs = {
            "invoice_number": {"required": False, "allow_blank": True},
        }
        read_only_fields = [
            "status",
            "created_by",
            "created_at",
            "updated_at",
            "subtotal",
            "tax_amount",
            "total_amount",
            "submitted_at",
            "submitted_by",
            "approved_at",
            "approved_by",
            "rejected_at",
            "rejected_by",
            "rejection_reason",
        ]

    def validate(self, attrs):
        items_data = attrs.get("items")
        project = attrs.get("project") or getattr(self.instance, "project", None)
        cost_code = attrs.get("cost_code") if "cost_code" in attrs else getattr(self.instance, "cost_code", None)
        customer = attrs.get("customer") if "customer" in attrs else getattr(self.instance, "customer", None)
        partner_name = attrs.get("partner_name") or getattr(self.instance, "partner_name", None)

        if customer and not partner_name:
            attrs["partner_name"] = customer.name

        item_cost_codes = []
        if items_data is not None:
            item_cost_codes = [item.get("cost_code") for item in items_data if item.get("cost_code")]
            unique_item_cost_codes = list({code.id: code for code in item_cost_codes}.values())
            if "cost_code" not in attrs:
                if len(unique_item_cost_codes) == 1:
                    attrs["cost_code"] = unique_item_cost_codes[0]
                    cost_code = unique_item_cost_codes[0]
                elif len(unique_item_cost_codes) > 1:
                    attrs["cost_code"] = None
                    cost_code = None

        if not project and cost_code:
            project = cost_code.project
            attrs["project"] = project

        if not project and item_cost_codes:
            project_ids = {code.project_id for code in item_cost_codes}
            if len(project_ids) == 1:
                project = item_cost_codes[0].project
                attrs["project"] = project

        if cost_code and project and cost_code.project_id != project.id:
            raise serializers.ValidationError({"cost_code": "Cost code must belong to the selected project."})

        _ensure_project_is_open(project)

        if project:
            for item_code in item_cost_codes:
                if item_code.project_id != project.id:
                    raise serializers.ValidationError({"items": "Item cost_code must belong to the selected project."})

        return attrs

    def _calculate_totals(self, invoice: Invoice):
        subtotal = Decimal("0.00")
        tax_amount = Decimal("0.00")

        for item in invoice.items.all():
            line_subtotal = item.quantity * item.unit_price
            line_tax = line_subtotal * (item.tax_rate / Decimal("100"))
            subtotal += line_subtotal
            tax_amount += line_tax

        invoice.subtotal = subtotal
        invoice.tax_amount = tax_amount
        invoice.total_amount = subtotal + tax_amount
        invoice.save(update_fields=["subtotal", "tax_amount", "total_amount", "updated_at"])

    def create(self, validated_data):
        items_data = validated_data.pop("items", [])
        if not validated_data.get("invoice_number"):
            validated_data["invoice_number"] = next_invoice_number()
        invoice = Invoice.objects.create(**validated_data)

        for item_data in items_data:
            InvoiceItem.objects.create(invoice=invoice, **item_data)

        self._calculate_totals(invoice)
        return invoice

    def update(self, instance, validated_data):
        items_data = validated_data.pop("items", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if items_data is not None:
            instance.items.all().delete()
            for item_data in items_data:
                InvoiceItem.objects.create(invoice=instance, **item_data)

        self._calculate_totals(instance)
        return instance


class ProgressBillingSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProgressBilling
        fields = [
            "id",
            "project",
            "billing_number",
            "status",
            "billing_date",
            "period_start",
            "period_end",
            "completion_percentage",
            "contract_value_snapshot",
            "subtotal",
            "tax_rate",
            "tax_amount",
            "total_amount",
            "linked_invoice",
            "notes",
            "created_by",
            "submitted_at",
            "submitted_by",
            "approved_at",
            "approved_by",
            "rejected_at",
            "rejected_by",
            "rejection_reason",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "status",
            "contract_value_snapshot",
            "subtotal",
            "tax_amount",
            "total_amount",
            "linked_invoice",
            "created_by",
            "submitted_at",
            "submitted_by",
            "approved_at",
            "approved_by",
            "rejected_at",
            "rejected_by",
            "rejection_reason",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        project = attrs.get("project") or getattr(self.instance, "project", None)
        period_start = attrs.get("period_start", getattr(self.instance, "period_start", None))
        period_end = attrs.get("period_end", getattr(self.instance, "period_end", None))

        _ensure_project_is_open(project)

        if self.instance and self.instance.status != ProgressBilling.Status.DRAFT:
            raise serializers.ValidationError({"status": "Only draft progress billings can be modified."})
        if self.instance and "project" in attrs and attrs["project"].id != self.instance.project_id:
            raise serializers.ValidationError({"project": "Project cannot be changed after creation."})
        if period_start and period_end and period_start > period_end:
            raise serializers.ValidationError({"period_end": "Period end date must be greater than period start date."})

        return attrs


class RevenueRecognitionEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = RevenueRecognitionEntry
        fields = [
            "id",
            "project",
            "entry_number",
            "method",
            "status",
            "recognition_date",
            "progress_billing",
            "recognized_percentage",
            "recognized_amount",
            "notes",
            "created_by",
            "submitted_at",
            "submitted_by",
            "approved_at",
            "approved_by",
            "rejected_at",
            "rejected_by",
            "rejection_reason",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "status",
            "recognized_amount",
            "created_by",
            "submitted_at",
            "submitted_by",
            "approved_at",
            "approved_by",
            "rejected_at",
            "rejected_by",
            "rejection_reason",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        project = attrs.get("project") or getattr(self.instance, "project", None)
        method = attrs.get("method") or getattr(self.instance, "method", None)
        progress_billing = attrs.get("progress_billing", getattr(self.instance, "progress_billing", None))
        recognized_percentage = attrs.get("recognized_percentage", getattr(self.instance, "recognized_percentage", Decimal("0.00")))

        if self.instance and self.instance.status != RevenueRecognitionEntry.Status.DRAFT:
            raise serializers.ValidationError({"status": "Only draft revenue entries can be modified."})
        if self.instance and "project" in attrs and attrs["project"].id != self.instance.project_id:
            raise serializers.ValidationError({"project": "Project cannot be changed after creation."})

        if method == RevenueRecognitionEntry.RecognitionMethod.PERCENTAGE_OF_COMPLETION:
            _ensure_project_is_open(project)
            if not progress_billing and recognized_percentage <= Decimal("0.00"):
                raise serializers.ValidationError(
                    {
                        "recognized_percentage": "Provide a positive percentage or select an approved progress billing."
                    }
                )
        elif method == RevenueRecognitionEntry.RecognitionMethod.COMPLETED_CONTRACT:
            if progress_billing:
                raise serializers.ValidationError(
                    {"progress_billing": "Completed contract method cannot reference a progress billing."}
                )
            if project and project.status != Project.Status.COMPLETED:
                raise serializers.ValidationError(
                    {"project": "Completed contract method requires the project status to be completed."}
                )

        if progress_billing:
            if project and progress_billing.project_id != project.id:
                raise serializers.ValidationError(
                    {"progress_billing": "Progress billing must belong to the selected project."}
                )
            if progress_billing.status not in {ProgressBilling.Status.APPROVED, ProgressBilling.Status.INVOICED}:
                raise serializers.ValidationError(
                    {"progress_billing": "Progress billing must be approved before it can be recognized."}
                )

        return attrs


class PaymentSerializer(serializers.ModelSerializer):
    invoice_number = serializers.CharField(source="invoice.invoice_number", read_only=True)
    currency = serializers.CharField(source="invoice.currency", read_only=True)

    class Meta:
        model = Payment
        fields = [
            "id",
            "invoice",
            "invoice_number",
            "payment_date",
            "amount",
            "currency",
            "method",
            "status",
            "reference_no",
            "recorded_by",
            "submitted_at",
            "submitted_by",
            "approved_at",
            "approved_by",
            "rejected_at",
            "rejected_by",
            "rejection_reason",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "status",
            "recorded_by",
            "created_at",
            "updated_at",
            "submitted_at",
            "submitted_by",
            "approved_at",
            "approved_by",
            "rejected_at",
            "rejected_by",
            "rejection_reason",
        ]
