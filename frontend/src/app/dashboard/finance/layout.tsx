import { SectionShell } from "@/components/layout/section-shell";
import { enforceAreaAccess } from "@/lib/server/route-access";

const tabs = [
  { href: "/dashboard/finance", label: "نظرة عامة" },
  { href: "/dashboard/finance/operations", label: "عمليات" },
  { href: "/dashboard/finance/accounting", label: "محاسبة" },
  { href: "/dashboard/finance/reports", label: "تقارير" },
  { href: "/dashboard/finance/setup", label: "إعدادات" },
];

const tabMeta = {
  "/dashboard/finance": { tier: "primary", badge: "أساسي" },
  "/dashboard/finance/operations": { tier: "primary", badge: "أولوية 1" },
  "/dashboard/finance/accounting": { tier: "primary", badge: "أولوية 2" },
  "/dashboard/finance/reports": { tier: "primary", badge: "أولوية 3" },
  "/dashboard/finance/setup": { tier: "primary", badge: "أولوية 4" },
} as const;

const tabActions = [
  { label: "تعليمات الاستخدام", href: "/dashboard/finance/guides/overview", variant: "outline" as const },
];

export default async function FinanceLayout({ children }: { children: React.ReactNode }) {
  await enforceAreaAccess("finance");
  return (
    <SectionShell
      title="قسم المالية"
      description="مدخل هرمي موحد يبدأ من نظرة عامة ثم يتدرج حسب الأولوية: عمليات، محاسبة، تقارير، إعدادات."
      tabs={tabs}
      tabMeta={tabMeta}
      tabActions={tabActions}
    >
      {children}
    </SectionShell>
  );
}
