"use client";

import Link from "next/link";

const links = [
  { href: "/dashboard/real-estate/projects", label: "المشروعات", description: "تعريف المشروعات العقارية والعملات والفترات." },
  { href: "/dashboard/real-estate/buildings", label: "المباني", description: "إدارة المباني وربطها بالمشروعات." },
  { href: "/dashboard/real-estate/unit-types", label: "أنواع الوحدات", description: "تصنيف الوحدات حسب المساحة وعدد الغرف." },
  { href: "/dashboard/real-estate/units", label: "الوحدات", description: "سجل الوحدات وحالات التوفر والربط بالمباني." },
  { href: "/dashboard/real-estate/unit-pricing", label: "تسعير الوحدات", description: "إدارة أسعار الوحدات وتواريخ السريان." },
  { href: "/dashboard/real-estate/reservations", label: "الحجوزات", description: "حجوزات العملاء وتثبيت الحالة." },
  { href: "/dashboard/real-estate/sales-contracts", label: "عقود البيع", description: "تحويل الحجز إلى عقد بيع وربط الدفعة المقدمة." },
  { href: "/dashboard/real-estate/payment-schedules", label: "جداول السداد", description: "جدولة الدفعات للعقود النشطة." },
  { href: "/dashboard/real-estate/installments", label: "الأقساط", description: "متابعة الأقساط وحالة السداد والفواتير المرتبطة." },
  { href: "/dashboard/real-estate/handovers", label: "التسليم", description: "توثيق تسليم الوحدات وتغيير الحالة." },
];

export default function RealEstateIndexPage() {
  return (
    <section className="resource-section">
      <header className="resource-header">
        <div>
          <h3>وحدة العقارات</h3>
          <p>اختصار لكل مراحل البيع: الحجز، العقد، الجدولة، الأقساط، المدفوعات والتسليم.</p>
        </div>
      </header>

      <div className="section-grid" style={{ marginTop: "0.8rem" }}>
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="section-card">
            <strong>{link.label}</strong>
            <p>{link.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
