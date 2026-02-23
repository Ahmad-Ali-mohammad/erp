import Link from "next/link";

const links = [
  { href: "/dashboard/accounting-v2/inventory/movements", label: "حركات المخزون" },
  { href: "/dashboard/accounting-v2/inventory/adjustments", label: "تسويات المخزون" },
  { href: "/dashboard/accounting-v2/inventory/count-sessions", label: "جلسات الجرد" },
];

export default function AccountingV2InventoryPage() {
  return (
    <section className="resource-section">
      <header className="resource-header">
        <div>
          <h3>المخزون</h3>
          <p>حركات المخزون تُنشأ من العمليات التشغيلية فقط ولا يتم تعديل الأرصدة مباشرة.</p>
        </div>
      </header>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem" }}>
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="btn btn-outline">
            {link.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
