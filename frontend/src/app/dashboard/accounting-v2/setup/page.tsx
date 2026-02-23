import Link from "next/link";

const links = [
  { href: "/dashboard/accounting-v2/setup/accounts", label: "شجرة الحسابات" },
  { href: "/dashboard/accounting-v2/setup/cost-centers", label: "مراكز التكلفة" },
  { href: "/dashboard/accounting-v2/setup/customers", label: "العملاء" },
  { href: "/dashboard/accounting-v2/setup/vendors", label: "الموردون" },
  { href: "/dashboard/accounting-v2/setup/items", label: "الأصناف" },
  { href: "/dashboard/accounting-v2/setup/locations", label: "المواقع المخزنية" },
];

export default function AccountingV2SetupPage() {
  return (
    <section className="resource-section">
      <header className="resource-header">
        <div>
          <h3>التهيئة</h3>
          <p>إدارة الهياكل المرجعية والبيانات الأساسية المعتمدة في المحاسبة v2.</p>
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
