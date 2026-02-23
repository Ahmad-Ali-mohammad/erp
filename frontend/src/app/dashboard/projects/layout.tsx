import { enforceAreaAccess } from "@/lib/server/route-access";
import { SectionShell } from "@/components/layout/section-shell";

const tabs = [
  { href: "/dashboard/projects", label: "المشاريع" },
  { href: "/dashboard/projects/details", label: "تفاصيل المشروع" },
  { href: "/dashboard/projects/phases", label: "المراحل" },
  { href: "/dashboard/projects/boq-items", label: "بنود BoQ" },
  { href: "/dashboard/projects/cost-codes", label: "أكواد التكلفة" },
  { href: "/dashboard/projects/budget-lines", label: "بنود الميزانية" },
  { href: "/dashboard/projects/cost-records", label: "سجلات التكلفة" },
  { href: "/dashboard/projects/change-orders", label: "أوامر التغيير" },
];

export default async function ProjectsLayout({ children }: { children: React.ReactNode }) {
  await enforceAreaAccess("projects");
  return (
    <SectionShell
      title="المشاريع"
      description="إدارة دورة المشروع مع التكاليف والتغييرات."
      tabs={tabs}
    >
      {children}
    </SectionShell>
  );
}
