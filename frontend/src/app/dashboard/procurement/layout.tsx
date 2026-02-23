import { enforceAreaAccess } from "@/lib/server/route-access";
import { SectionShell } from "@/components/layout/section-shell";

const tabs = [
  { href: "/dashboard/procurement", label: "نظرة عامة" },
  { href: "/dashboard/procurement/suppliers", label: "الموردون" },
  { href: "/dashboard/procurement/warehouses", label: "المستودعات" },
  { href: "/dashboard/procurement/materials", label: "المواد" },
  { href: "/dashboard/procurement/purchase-requests", label: "طلبات الشراء" },
  { href: "/dashboard/procurement/purchase-orders", label: "أوامر الشراء" },
  { href: "/dashboard/procurement/stock-transactions", label: "المخزون" },
];

export default async function ProcurementLayout({ children }: { children: React.ReactNode }) {
  await enforceAreaAccess("procurement");
  return (
    <SectionShell
      title="المشتريات"
      description="إدارة دورة المشتريات والمخزون والموردين."
      tabs={tabs}
    >
      {children}
    </SectionShell>
  );
}
