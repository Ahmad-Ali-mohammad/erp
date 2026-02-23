import { enforceAreaAccess } from "@/lib/server/route-access";
import { SectionShell } from "@/components/layout/section-shell";

const tabs = [
  { href: "/dashboard/admin", label: "نظرة عامة" },
  { href: "/dashboard/admin/roles", label: "الأدوار" },
  { href: "/dashboard/admin/users", label: "المستخدمون" },
  { href: "/dashboard/admin/audit-logs", label: "سجل التدقيق" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await enforceAreaAccess("admin");
  return (
    <SectionShell title="الإدارة" description="إدارة الأدوار والصلاحيات ومتابعة السجلات." tabs={tabs}>
      {children}
    </SectionShell>
  );
}
