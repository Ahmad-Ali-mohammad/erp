import Link from "next/link";

const links = [
  { href: "/dashboard/accounting-v2/procurement/orders", label: "أوامر الشراء" },
  { href: "/dashboard/accounting-v2/procurement/invoices", label: "فواتير المشتريات" },
];

export default function AccountingV2ProcurementPage() {
  return (
    <section className="resource-section">
      <header className="resource-header">
        <div>
          <h3>المشتريات</h3>
          <p>إدارة دورة الشراء من أمر الشراء حتى فاتورة المورد والسداد.</p>
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
