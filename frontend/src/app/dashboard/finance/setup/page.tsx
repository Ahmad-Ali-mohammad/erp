"use client";

import Link from "next/link";

const setupPriorities = [
  {
    title: "الأولوية 1: إعدادات أساسية (v2)",
    tierClass: "tier-primary",
    description: "هذه الإعدادات تؤثر مباشرة على جودة التشغيل اليومي.",
    links: [
      { href: "/dashboard/accounting-v2/setup/accounts", label: "شجرة الحسابات" },
      { href: "/dashboard/accounting-v2/setup/cost-centers", label: "مراكز التكلفة" },
      { href: "/dashboard/accounting-v2/setup/items", label: "الأصناف" },
    ],
  },
  {
    title: "الأولوية 2: قواعد وضبط مالي (v1)",
    tierClass: "tier-secondary",
    description: "استخدمها للتوافق المرحلي أو الضبط التفصيلي المتقدم.",
    links: [
      { href: "/dashboard/finance/setup/posting-rules", label: "قواعد الترحيل" },
      { href: "/dashboard/finance/setup/periods", label: "الفترات المالية" },
      { href: "/dashboard/finance/setup/recurring-templates", label: "القيود المتكررة" },
    ],
  },
  {
    title: "الأولوية 3: البنك والطباعة والهوية",
    tierClass: "tier-secondary",
    description: "إعدادات تشغيل داعمة للتسوية والإخراج الرسمي.",
    links: [
      { href: "/dashboard/finance/setup/bank-accounts", label: "الحسابات البنكية" },
      { href: "/dashboard/finance/setup/print-settings", label: "إعدادات الطباعة" },
      { href: "/dashboard/finance/setup/company-profile", label: "هوية الشركة" },
    ],
  },
];

export default function FinanceSetupPage() {
  return (
    <section className="resource-section">
      <header className="resource-header">
        <div>
          <h3>الإعدادات</h3>
          <p>متى أستخدم هذا التبويب؟ عند تأسيس القواعد المرجعية أو تعديل الضبط المحاسبي قبل التشغيل.</p>
        </div>
      </header>

      <div className="hero-actions" style={{ marginTop: "0.8rem" }}>
        <Link className="btn btn-primary" href="/dashboard/accounting-v2/setup/accounts">
          أهم إجراء 1: ضبط شجرة الحسابات
        </Link>
        <Link className="btn btn-outline" href="/dashboard/accounting-v2/setup/cost-centers">
          أهم إجراء 2: ضبط مراكز التكلفة
        </Link>
        <Link className="btn btn-outline" href="/dashboard/finance/guides/setup">
          تعليمات الاستخدام
        </Link>
      </div>

      <section className="priority-grid" style={{ marginTop: "0.8rem" }}>
        {setupPriorities.map((priority) => (
          <article key={priority.title} className="priority-card">
            <div className={`priority-chip ${priority.tierClass}`}>{priority.title}</div>
            <p>{priority.description}</p>
            <div className="hero-actions">
              {priority.links.map((link) => (
                <Link key={link.href} href={link.href} className="btn btn-outline">
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
