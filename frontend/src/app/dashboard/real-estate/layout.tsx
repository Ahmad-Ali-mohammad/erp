import { enforceAreaAccess } from "@/lib/server/route-access";
import { SectionShell } from "@/components/layout/section-shell";

const tabs = [
  { href: "/dashboard/real-estate", label: "نظرة عامة" },
  { href: "/dashboard/real-estate/projects", label: "المشروعات" },
  { href: "/dashboard/real-estate/buildings", label: "المباني" },
  { href: "/dashboard/real-estate/unit-types", label: "أنواع الوحدات" },
  { href: "/dashboard/real-estate/units", label: "الوحدات" },
  { href: "/dashboard/real-estate/unit-pricing", label: "تسعير الوحدات" },
  { href: "/dashboard/real-estate/reservations", label: "الحجوزات" },
  { href: "/dashboard/real-estate/sales-contracts", label: "عقود البيع" },
  { href: "/dashboard/real-estate/payment-schedules", label: "جداول السداد" },
  { href: "/dashboard/real-estate/installments", label: "الأقساط" },
  { href: "/dashboard/real-estate/handovers", label: "التسليم" },
];

export default async function RealEstateLayout({ children }: { children: React.ReactNode }) {
  await enforceAreaAccess("real_estate");
  return (
    <SectionShell
      title="وحدة العقارات"
      description="إدارة دورة بيع العقارات من الوحدة وحتى التسليم والمدفوعات."
      tabs={tabs}
    >
      {children}
    </SectionShell>
  );
}
