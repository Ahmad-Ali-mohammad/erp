import Link from "next/link";

const procurementLinks = [
  { href: "/dashboard/procurement/suppliers", label: "الموردون", description: "إدارة بيانات الموردين." },
  { href: "/dashboard/procurement/warehouses", label: "المستودعات", description: "إدارة مواقع التخزين." },
  { href: "/dashboard/procurement/materials", label: "المواد", description: "تعريف المواد ووحدات القياس." },
  { href: "/dashboard/procurement/purchase-requests", label: "طلبات الشراء", description: "طلبات شراء المواد والخدمات." },
  { href: "/dashboard/procurement/purchase-orders", label: "أوامر الشراء", description: "أوامر الشراء المعتمدة." },
  { href: "/dashboard/procurement/stock-transactions", label: "المخزون", description: "حركة المخزون والتحويلات." },
];

export default function ProcurementIndexPage() {
  return (
    <section className="resource-section">
      <header className="resource-header">
        <div>
          <h3>وحدة المشتريات</h3>
          <p>اختر الشاشة المطلوبة لإدارة الموردين والطلبات والأوامر والمخزون.</p>
        </div>
      </header>

      <div className="section-grid" style={{ marginTop: "0.8rem" }}>
        {procurementLinks.map((link) => (
          <Link key={link.href} href={link.href} className="section-card">
            <strong>{link.label}</strong>
            <p>{link.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
