"use client";

import Link from "next/link";

const reportPriorities = [
  {
    title: "الأولوية 1: التقارير الأساسية (v2)",
    tierClass: "tier-primary",
    description: "المسار الأساسي المعتمد لقراءة النتائج المالية والتحليلية.",
    links: [
      { href: "/dashboard/accounting-v2/reports", label: "لوحة التقارير (v2)" },
      { href: "/dashboard/accounting-v2/reports", label: "ميزان المراجعة / قائمة الدخل / الميزانية" },
      { href: "/dashboard/accounting-v2/reports", label: "أعمار الذمم / الربحية" },
    ],
  },
  {
    title: "الأولوية 2: التقارير التفصيلية (v1)",
    tierClass: "tier-secondary",
    description: "للرجوع المرحلي حتى اكتمال التحول.",
    links: [
      { href: "/dashboard/finance/accounting/trial-balance", label: "ميزان المراجعة v1" },
      { href: "/dashboard/finance/accounting/general-ledger", label: "دفتر الأستاذ v1" },
      { href: "/dashboard/finance/accounting/income-statement", label: "قائمة الدخل v1" },
    ],
  },
  {
    title: "الأولوية 3: المطبوعات والإخراج",
    tierClass: "tier-secondary",
    description: "مخرجات الطباعة والتقارير الجاهزة للمشاركة.",
    links: [
      { href: "/dashboard/finance/printouts", label: "الفواتير والمطبوعات" },
      { href: "/dashboard/finance/printouts", label: "الطباعة الرسمية" },
      { href: "/dashboard/finance/setup/print-settings", label: "ضبط تنسيق الطباعة" },
    ],
  },
];

export default function FinanceReportsPage() {
  return (
    <section className="resource-section">
      <header className="resource-header">
        <div>
          <h3>التقارير</h3>
          <p>متى أستخدم هذا التبويب؟ بعد الترحيل لمراجعة الأداء المالي واستخراج المخرجات الرسمية.</p>
        </div>
      </header>

      <div className="hero-actions" style={{ marginTop: "0.8rem" }}>
        <Link className="btn btn-primary" href="/dashboard/accounting-v2/reports">
          أهم إجراء 1: عرض تقارير v2
        </Link>
        <Link className="btn btn-outline" href="/dashboard/finance/accounting/trial-balance">
          أهم إجراء 2: مراجعة ميزان المراجعة
        </Link>
        <Link className="btn btn-outline" href="/dashboard/finance/guides/reports">
          تعليمات الاستخدام
        </Link>
      </div>

      <section className="priority-grid" style={{ marginTop: "0.8rem" }}>
        {reportPriorities.map((priority) => (
          <article key={priority.title} className="priority-card">
            <div className={`priority-chip ${priority.tierClass}`}>{priority.title}</div>
            <p>{priority.description}</p>
            <div className="hero-actions">
              {priority.links.map((link, index) => (
                <Link key={`${link.href}-${index}`} href={link.href} className="btn btn-outline">
                  {link.label}
                </Link>
              ))}
            </div>
          </article>
        ))}
      </section>
    </section>
  );
}
