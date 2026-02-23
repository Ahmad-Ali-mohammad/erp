import Link from "next/link";

const links = [
  { href: "/dashboard/accounting-v2/treasury/receipts", label: "سندات القبض" },
  { href: "/dashboard/accounting-v2/treasury/payments", label: "سندات الدفع" },
  { href: "/dashboard/accounting-v2/treasury/cheques", label: "الشيكات" },
];

export default function AccountingV2TreasuryPage() {
  return (
    <section className="resource-section">
      <header className="resource-header">
        <div>
          <h3>الخزينة</h3>
          <p>تحصيل وسداد الفواتير مع متابعة دورة حياة الشيكات.</p>
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
