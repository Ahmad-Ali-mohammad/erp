import { SectionShell } from "@/components/layout/section-shell";
import { enforceAreaAccess } from "@/lib/server/route-access";

const tabs = [
  { href: "/dashboard/accounting-v2", label: "نظرة عامة" },
  { href: "/dashboard/accounting-v2/setup", label: "التهيئة" },
  { href: "/dashboard/accounting-v2/sales", label: "المبيعات" },
  { href: "/dashboard/accounting-v2/procurement", label: "المشتريات" },
  { href: "/dashboard/accounting-v2/inventory", label: "المخزون" },
  { href: "/dashboard/accounting-v2/treasury", label: "الخزينة" },
  { href: "/dashboard/accounting-v2/banking", label: "البنوك" },
  { href: "/dashboard/accounting-v2/gl", label: "الأستاذ العام" },
  { href: "/dashboard/accounting-v2/reports", label: "التقارير" },
];

export default async function AccountingV2Layout({ children }: { children: React.ReactNode }) {
  await enforceAreaAccess("finance");
  return (
    <SectionShell
      title="المحاسبة v2"
      description="مساحة تشغيل محاسبية لإعداد البيانات، تنفيذ العمليات، الترحيل، وإصدار التقارير."
      tabs={tabs}
    >
      {children}
    </SectionShell>
  );
}
