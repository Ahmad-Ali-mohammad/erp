from django.contrib import admin

from .models import (
    Account,
    BankAccount,
    BankReconciliationSession,
    BankStatement,
    ExchangeRate,
    FiscalPeriod,
    Invoice,
    InvoiceItem,
    JournalEntry,
    JournalLine,
    Payment,
    PostingRule,
    PrintSettings,
    RecurringEntryTemplate,
)


class JournalLineInline(admin.TabularInline):
    model = JournalLine
    extra = 0


@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "account_type", "report_group", "is_active", "is_control_account")
    list_filter = ("account_type", "report_group", "is_active", "is_control_account")
    search_fields = ("code", "name")


@admin.register(JournalEntry)
class JournalEntryAdmin(admin.ModelAdmin):
    list_display = ("entry_number", "entry_date", "status", "entry_class", "currency", "project")
    list_filter = ("status", "entry_class", "entry_date", "currency")
    search_fields = ("entry_number", "description", "project__code")
    inlines = [JournalLineInline]


class InvoiceItemInline(admin.TabularInline):
    model = InvoiceItem
    extra = 0


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = (
        "invoice_number",
        "invoice_type",
        "partner_name",
        "customer",
        "issue_date",
        "status",
        "total_amount",
    )
    list_filter = ("invoice_type", "status", "currency")
    search_fields = ("invoice_number", "partner_name", "project__code")
    inlines = [InvoiceItemInline]


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("invoice", "payment_date", "amount", "method", "status")
    list_filter = ("status", "method")
    search_fields = ("invoice__invoice_number", "reference_no")


@admin.register(FiscalPeriod)
class FiscalPeriodAdmin(admin.ModelAdmin):
    list_display = ("year", "month", "start_date", "end_date", "status")
    list_filter = ("status", "year", "month")
    search_fields = ("year", "month")


@admin.register(ExchangeRate)
class ExchangeRateAdmin(admin.ModelAdmin):
    list_display = ("from_currency", "to_currency", "rate_date", "rate")
    list_filter = ("from_currency", "to_currency")
    search_fields = ("from_currency", "to_currency")


@admin.register(PrintSettings)
class PrintSettingsAdmin(admin.ModelAdmin):
    list_display = ("watermark_type", "invoice_prefix", "invoice_padding", "invoice_next_number", "updated_at")
    list_filter = ("watermark_type",)


@admin.register(PostingRule)
class PostingRuleAdmin(admin.ModelAdmin):
    list_display = ("name", "source_module", "source_event", "is_active", "posting_policy")
    list_filter = ("is_active", "posting_policy", "entry_class")
    search_fields = ("name", "source_module", "source_event")


@admin.register(RecurringEntryTemplate)
class RecurringEntryTemplateAdmin(admin.ModelAdmin):
    list_display = ("template_code", "name", "frequency", "next_run_date", "is_active", "auto_post")
    list_filter = ("frequency", "is_active", "auto_post")
    search_fields = ("template_code", "name")


@admin.register(BankAccount)
class BankAccountAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "bank_name", "currency", "is_active")
    list_filter = ("currency", "is_active")
    search_fields = ("code", "name", "bank_name")


@admin.register(BankStatement)
class BankStatementAdmin(admin.ModelAdmin):
    list_display = ("bank_account", "statement_date", "opening_balance", "closing_balance", "status")
    list_filter = ("status", "bank_account")
    search_fields = ("bank_account__code", "bank_account__name")


@admin.register(BankReconciliationSession)
class BankReconciliationSessionAdmin(admin.ModelAdmin):
    list_display = ("bank_account", "period", "status", "started_at", "closed_at")
    list_filter = ("status", "bank_account")
