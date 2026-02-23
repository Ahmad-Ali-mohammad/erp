from core.models import Sequence

from django.core.management.base import BaseCommand

from erp_v2.models import (
    CostCenter,
    GLAccount,
    InventoryLocation,
    PostingRule,
    PostingRuleLine,
)

DEFAULT_ACCOUNTS = [
    ("1100", GLAccount.AccountType.ASSET, "Accounts Receivable"),
    ("1110", GLAccount.AccountType.ASSET, "Cash"),
    ("1120", GLAccount.AccountType.ASSET, "Bank"),
    ("1200", GLAccount.AccountType.ASSET, "Inventory"),
    ("2100", GLAccount.AccountType.LIABILITY, "Accounts Payable"),
    ("4100", GLAccount.AccountType.REVENUE, "Sales"),
    ("5100", GLAccount.AccountType.EXPENSE, "Cost of Goods Sold"),
    ("5200", GLAccount.AccountType.EXPENSE, "Purchases"),
    ("4190", GLAccount.AccountType.REVENUE, "Inventory Adjustment Gain"),
    ("5190", GLAccount.AccountType.EXPENSE, "Inventory Adjustment Loss"),
]

DEFAULT_SEQUENCES = [
    ("erp_v2_sales_quotation", "SQT-"),
    ("erp_v2_sales_order", "SOR-"),
    ("erp_v2_sales_invoice", "SIN-"),
    ("erp_v2_sales_pos_invoice", "POS-"),
    ("erp_v2_purchase_order", "POV2-"),
    ("erp_v2_purchase_receipt", "GRN-"),
    ("erp_v2_purchase_invoice", "PIN-"),
    ("erp_v2_treasury_receipt", "RCV-"),
    ("erp_v2_treasury_payment", "PAY-"),
    ("erp_v2_bank_statement", "BST-"),
    ("erp_v2_inventory_count_session", "CNT-"),
    ("erp_v2_inventory_adjustment", "ADJ-"),
    ("erp_v2_glv2_entry", "GLV2-"),
    ("erp_v2_rcpt_entry", "RCPT-"),
    ("erp_v2_pmt_entry", "PMT-"),
    ("erp_v2_adj_entry", "ADJ-"),
]

DEFAULT_POSTING_RULES = {
    "sales_invoice": [
        ("debit", "1100", "total_amount"),
        ("credit", "4100", "total_amount"),
        ("debit", "5100", "cogs_total"),
        ("credit", "1200", "cogs_total"),
    ],
    "purchase_invoice": [
        ("debit", "1200", "total_amount"),
        ("credit", "2100", "total_amount"),
    ],
    "treasury_receipt": [
        ("debit", "1110", "amount"),
        ("credit", "1100", "amount"),
    ],
    "treasury_payment": [
        ("debit", "2100", "amount"),
        ("credit", "1110", "amount"),
    ],
    "inventory_adjustment": [
        ("debit", "1200", "amount"),
        ("credit", "4190", "amount"),
    ],
}


class Command(BaseCommand):
    help = "Seed ERP v2 default accounts, cost centers, and locations"

    def handle(self, *args, **options):
        created = 0
        accounts_by_code = {}
        for code, acc_type, name in DEFAULT_ACCOUNTS:
            obj, was_created = GLAccount.objects.get_or_create(
                code=code,
                defaults={"account_type": acc_type, "name": name, "level": 1, "is_postable": True},
            )
            accounts_by_code[code] = obj
            created += int(was_created)
        cc, cc_created = CostCenter.objects.get_or_create(code="CC-DEFAULT", defaults={"name": "Default Cost Center"})
        loc, loc_created = InventoryLocation.objects.get_or_create(
            code="MAIN",
            defaults={"name": "Main Warehouse"},
        )
        seq_created = 0
        for key, prefix in DEFAULT_SEQUENCES:
            _, was_created = Sequence.objects.get_or_create(
                key=key,
                defaults={"prefix": prefix, "padding": 7, "next_number": 1},
            )
            seq_created += int(was_created)

        rules_created = 0
        rule_lines_created = 0
        for source_type, lines in DEFAULT_POSTING_RULES.items():
            rule, was_created = PostingRule.objects.get_or_create(
                name=f"default_{source_type}",
                defaults={"source_type": source_type, "strict": False, "is_active": True},
            )
            rules_created += int(was_created)
            for side, account_code, amount_field in lines:
                account = accounts_by_code.get(account_code) or GLAccount.objects.get(code=account_code)
                _, line_created = PostingRuleLine.objects.get_or_create(
                    rule=rule,
                    account=account,
                    side=side,
                    amount_field=amount_field,
                )
                rule_lines_created += int(line_created)

        self.stdout.write(
            self.style.SUCCESS(
                "Seeded GL accounts (+{accounts}), cost center ({cc}), location ({loc}), sequences (+{seq}), "
                "posting rules (+{rules}) and lines (+{rule_lines})".format(
                    accounts=created,
                    cc="new" if cc_created else "existing",
                    loc="new" if loc_created else "existing",
                    seq=seq_created,
                    rules=rules_created,
                    rule_lines=rule_lines_created,
                )
            )
        )
