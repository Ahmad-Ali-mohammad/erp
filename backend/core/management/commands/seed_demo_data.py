from decimal import Decimal
from datetime import timedelta
from django.utils import timezone

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from core.models import Role, Customer
from finance.models import Account
from procurement.models import Material, Supplier, Warehouse
from projects.models import Project, ProjectPhase
from real_estate.models import (
    RealEstateProject,
    Building,
    UnitType,
    Unit,
    UnitPricing,
    Reservation,
    SalesContract,
    PaymentSchedule,
    Installment,
    Handover,
)


class Command(BaseCommand):
    help = "Seed initial demo data for construction ERP"

    def handle(self, *args, **options):
        self.stdout.write("Seeding demo data...")

        roles = [
            ("Admin", "admin"),
            ("Accountant", "accountant"),
            ("Project Manager", "project-manager"),
            ("Site Supervisor", "site-supervisor"),
            ("Project Accountant", "project_accountant"),
            ("Procurement Manager", "procurement_manager"),
            ("Procurement Officer", "procurement_officer"),
            ("Finance Manager", "finance_manager"),
            ("Auditor", "auditor"),
            ("Viewer", "viewer"),
        ]

        for name, slug in roles:
            Role.objects.get_or_create(slug=slug, defaults={"name": name})

        user_model = get_user_model()
        demo_password = "Admin@12345"
        demo_users = [
            ("admin", "admin", "admin@example.com", True, True),
            ("accountant", "accountant", "accountant@example.com", False, False),
            ("project_manager", "project-manager", "pm@example.com", False, False),
            ("site_supervisor", "site-supervisor", "site@example.com", False, False),
            ("project_accountant", "project_accountant", "pa@example.com", False, False),
            ("procurement_manager", "procurement_manager", "proc-mgr@example.com", False, False),
            ("procurement_officer", "procurement_officer", "proc-off@example.com", False, False),
            ("finance_manager", "finance_manager", "fin-mgr@example.com", False, False),
            ("auditor", "auditor", "auditor@example.com", False, False),
            ("viewer", "viewer", "viewer@example.com", False, False),
        ]
        for username, role_slug, email, is_staff, is_super in demo_users:
            role = Role.objects.get(slug=role_slug)
            user, created = user_model.objects.get_or_create(
                username=username,
                defaults={
                    "email": email,
                    "is_staff": is_staff,
                    "is_superuser": is_super,
                    "role": role,
                    "is_active": True,
                },
            )
            user.is_active = True
            user.role = role
            user.set_password(demo_password)
            user.save()

        admin_user = user_model.objects.get(username="admin")

        project, _ = Project.objects.get_or_create(
            code="PRJ-1001",
            defaults={
                "name": "مشروع برج الأعمال",
                "client_name": "شركة النور",
                "status": Project.Status.ACTIVE,
                "budget": Decimal("5000000.00"),
                "contract_value": Decimal("6200000.00"),
                "created_by": admin_user,
            },
        )

        ProjectPhase.objects.get_or_create(
            project=project,
            sequence=1,
            defaults={
                "name": "الأساسات",
                "budget": Decimal("1200000.00"),
                "planned_progress": Decimal("100.00"),
                "actual_progress": Decimal("20.00"),
            },
        )

        chart_of_accounts = [
            ("1110", "الصندوق", "asset"),
            ("1120", "البنك", "asset"),
            ("1210", "ذمم مدينة", "asset"),
            ("2110", "ذمم دائنة", "liability"),
            ("4100", "إيرادات مشاريع", "revenue"),
            ("5100", "تكلفة مباشرة", "expense"),
        ]

        for code, name, account_type in chart_of_accounts:
            Account.objects.get_or_create(
                code=code,
                defaults={
                    "name": name,
                    "account_type": account_type,
                },
            )

        supplier, _ = Supplier.objects.get_or_create(
            code="SUP-001",
            defaults={
                "name": "الشركة العربية للتوريد",
                "phone": "+966500000000",
            },
        )
        Warehouse.objects.get_or_create(
            code="WH-001",
            defaults={
                "name": "مستودع الرياض الرئيسي",
                "location": "الرياض",
            },
        )
        Material.objects.get_or_create(
            sku="MAT-001",
            defaults={
                "name": "اسمنت بورتلاندي",
                "unit": "bag",
                "reorder_level": Decimal("500.000"),
                "preferred_supplier": supplier,
            },
        )

        # Real estate demo data
        customer, _ = Customer.objects.get_or_create(
            code="CUST-RE-001",
            defaults={
                "name": "Real Estate Customer",
                "email": "customer@example.com",
                "phone": "+96550000000",
                "is_active": True,
            },
        )

        re_project, _ = RealEstateProject.objects.get_or_create(
            code="RE-1001",
            defaults={
                "name": "Management Towers",
                "location": "Riyadh",
                "status": RealEstateProject.Status.ACTIVE,
                "currency": "KWD",
                "start_date": timezone.localdate(),
                "created_by": admin_user,
            },
        )

        building, _ = Building.objects.get_or_create(
            project=re_project,
            code="BLD-A",
            defaults={
                "name": "Tower A",
                "floors": 20,
            },
        )

        unit_type, _ = UnitType.objects.get_or_create(
            project=re_project,
            code="UT-2BR",
            defaults={
                "name": "Apartment 2BR",
                "bedrooms": 2,
                "bathrooms": 2,
                "area_sqm": Decimal("125.00"),
                "base_price": Decimal("120000.00"),
            },
        )

        unit, _ = Unit.objects.get_or_create(
            building=building,
            code="A-101",
            defaults={
                "unit_type": unit_type,
                "floor": 10,
                "area_sqm": Decimal("125.00"),
                "status": Unit.Status.AVAILABLE,
            },
        )

        UnitPricing.objects.get_or_create(
            unit=unit,
            price=Decimal("125000.00"),
            currency="KWD",
            effective_date=timezone.localdate(),
            defaults={"is_active": True},
        )

        reservation, _ = Reservation.objects.get_or_create(
            reservation_number="RSV-10001",
            defaults={
                "unit": unit,
                "customer": customer,
                "status": Reservation.Status.RESERVED,
                "reserved_at": timezone.now(),
                "expires_at": timezone.now() + timedelta(days=14),
                "created_by": admin_user,
            },
        )

        contract, _ = SalesContract.objects.get_or_create(
            contract_number="SC-10001",
            defaults={
                "unit": unit,
                "customer": customer,
                "reservation": reservation,
                "status": SalesContract.Status.ACTIVE,
                "contract_date": timezone.localdate(),
                "total_price": Decimal("125000.00"),
                "down_payment": Decimal("20000.00"),
                "currency": "KWD",
                "signed_by": "Customer",
                "created_by": admin_user,
            },
        )

        payment_schedule, _ = PaymentSchedule.objects.get_or_create(
            contract=contract,
            name="Main",
            defaults={
                "total_amount": Decimal("125000.00"),
                "start_date": timezone.localdate(),
                "end_date": timezone.localdate() + timedelta(days=180),
            },
        )

        Installment.objects.get_or_create(
            schedule=payment_schedule,
            installment_number="INST-10001",
            defaults={
                "due_date": timezone.localdate() + timedelta(days=30),
                "amount": Decimal("40000.00"),
                "status": Installment.Status.PENDING,
            },
        )
        Installment.objects.get_or_create(
            schedule=payment_schedule,
            installment_number="INST-10002",
            defaults={
                "due_date": timezone.localdate() + timedelta(days=120),
                "amount": Decimal("65000.00"),
                "status": Installment.Status.PENDING,
            },
        )

        Handover.objects.get_or_create(
            contract=contract,
            defaults={
                "status": Handover.Status.PENDING,
                "handover_date": None,
                "notes": "",
            },
        )

        if unit.status != Unit.Status.SOLD:
            unit.status = Unit.Status.SOLD
            unit.save(update_fields=["status", "updated_at"])

        self.stdout.write(self.style.SUCCESS("Demo data seeded successfully."))
        self.stdout.write("Admin user: admin / Admin@12345")
