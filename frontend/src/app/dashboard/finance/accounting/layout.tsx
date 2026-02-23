"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/dashboard/finance/accounting", label: "نظرة عامة" },
  { href: "/dashboard/finance/accounting/journal", label: "دفتر اليومية" },
  { href: "/dashboard/finance/accounting/general-ledger", label: "دفتر الأستاذ" },
  { href: "/dashboard/finance/accounting/trial-balance", label: "ميزان المراجعة" },
  { href: "/dashboard/finance/accounting/income-statement", label: "قائمة الدخل" },
  { href: "/dashboard/finance/accounting/balance-sheet", label: "الميزانية العمومية" },
  { href: "/dashboard/finance/accounting/period-close", label: "إقفال الفترات" },
  { href: "/dashboard/finance/accounting/recurring-entries", label: "القيود المتكررة" },
  { href: "/dashboard/finance/accounting/bank-reconciliation", label: "التسويات البنكية" },
];

export default function AccountingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <section className="resource-section">
      <header className="resource-header">
        <div>
          <h3>المحاسبة</h3>
          <p>متى أستخدم هذا التبويب؟ عند الترحيل، المراجعة، ضبط الفترات، واستخراج القوائم المالية.</p>
        </div>
      </header>

      <div className="hero-actions" style={{ marginTop: "0.7rem" }}>
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={clsx("btn btn-outline", {
              "btn-primary": pathname === tab.href || pathname.startsWith(`${tab.href}/`),
            })}
          >
            {tab.label}
          </Link>
        ))}
        <Link className="btn btn-outline" href="/dashboard/finance/guides/accounting">
          تعليمات الاستخدام
        </Link>
      </div>

      <div style={{ marginTop: "0.85rem" }}>{children}</div>
    </section>
  );
}
