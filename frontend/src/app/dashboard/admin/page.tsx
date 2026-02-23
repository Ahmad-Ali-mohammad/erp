import Link from "next/link";

const adminLinks = [
  { href: "/dashboard/admin/roles", label: "الأدوار", description: "إدارة الأدوار والصلاحيات." },
  { href: "/dashboard/admin/users", label: "المستخدمون", description: "إدارة المستخدمين وربطهم بالأدوار." },
  { href: "/dashboard/admin/audit-logs", label: "سجل التدقيق", description: "متابعة نشاطات النظام." },
];

export default function AdminIndexPage() {
  return (
    <section className="resource-section">
      <header className="resource-header">
        <div>
          <h3>وحدة الإدارة</h3>
          <p>متابعة المستخدمين والأدوار وسجل التدقيق.</p>
        </div>
      </header>

      <div className="section-grid" style={{ marginTop: "0.8rem" }}>
        {adminLinks.map((link) => (
          <Link key={link.href} href={link.href} className="section-card">
            <strong>{link.label}</strong>
            <p>{link.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
