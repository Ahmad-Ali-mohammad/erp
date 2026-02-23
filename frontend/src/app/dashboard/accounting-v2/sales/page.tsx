import Link from "next/link";

const links = [
  { href: "/dashboard/accounting-v2/sales/quotations", label: "عروض الأسعار" },
  { href: "/dashboard/accounting-v2/sales/orders", label: "أوامر البيع" },
  { href: "/dashboard/accounting-v2/sales/invoices", label: "فواتير البيع" },
  { href: "/dashboard/accounting-v2/sales/pos", label: "نقطة البيع" },
];

export default function AccountingV2SalesPage() {
  return (
    <section className="resource-section">
      <header className="resource-header">
        <div>
          <h3>المبيعات</h3>
          <p>إدارة دورة المبيعات من عرض السعر حتى التحصيل، إضافة إلى عمليات نقطة البيع.</p>
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
