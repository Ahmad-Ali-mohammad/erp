"use client";

import Link from "next/link";

const operationPriorities = [
  {
    title: "الأولوية 1: تشغيل يومي (v2)",
    tierClass: "tier-primary",
    description: "المسار الأساسي المعتمد للتنفيذ اليومي وربطه المحاسبي التلقائي.",
    actions: [
      { label: "المبيعات (عرض سعر ← أمر بيع ← فاتورة)", href: "/dashboard/accounting-v2/sales" },
      { label: "المشتريات (أمر شراء ← استلام ← فاتورة شراء)", href: "/dashboard/accounting-v2/procurement" },
      { label: "الخزينة (سند قبض/سند دفع/شيكات)", href: "/dashboard/accounting-v2/treasury" },
    ],
  },
  {
    title: "الأولوية 2: تدقيق ومطابقة",
    tierClass: "tier-primary",
    description: "مراجعة أثر العمليات على المخزون والبنوك قبل الإغلاق.",
    actions: [
      { label: "حركات المخزون", href: "/dashboard/accounting-v2/inventory/movements" },
      { label: "التسوية البنكية (CSV)", href: "/dashboard/accounting-v2/banking" },
      { label: "قيود دفتر الأستاذ", href: "/dashboard/accounting-v2/gl/journal-entries" },
    ],
  },
  {
    title: "الأولوية 3: روابط النظام السابق (v1)",
    tierClass: "tier-secondary",
    description: "للمتابعة أو التوافق المرحلي مع الشاشات القديمة دون تعطيل المسار الأساسي.",
    actions: [
      { label: "الفواتير v1", href: "/dashboard/finance/invoices" },
      { label: "المدفوعات v1", href: "/dashboard/finance/payments" },
      { label: "الاعتراف بالإيراد v1", href: "/dashboard/finance/revenue-recognition" },
    ],
  },
];

export default function FinanceOperationsPage() {
  return (
    <section className="resource-section">
      <header className="resource-header">
        <div>
          <h3>العمليات</h3>
          <p>متى أستخدم هذا التبويب؟ عند تنفيذ الدورة اليومية للمعاملات قبل الوصول للتقارير والإقفال.</p>
        </div>
      </header>

      <div className="hero-actions" style={{ marginTop: "0.8rem" }}>
        <Link className="btn btn-primary" href="/dashboard/accounting-v2/sales">
          أهم إجراء 1: ابدأ المبيعات
        </Link>
        <Link className="btn btn-outline" href="/dashboard/accounting-v2/procurement">
          أهم إجراء 2: ابدأ المشتريات
        </Link>
        <Link className="btn btn-outline" href="/dashboard/finance/guides/operations">
          تعليمات الاستخدام
        </Link>
      </div>

      <section className="priority-grid" style={{ marginTop: "0.8rem" }}>
        {operationPriorities.map((priority) => (
          <article key={priority.title} className="priority-card">
            <div className={`priority-chip ${priority.tierClass}`}>{priority.title}</div>
            <p>{priority.description}</p>
            <div className="hero-actions">
              {priority.actions.map((action) => (
                <Link key={action.href} href={action.href} className="btn btn-outline">
                  {action.label}
                </Link>
              ))}
            </div>
          </article>
        ))}
      </section>
    </section>
  );
}
