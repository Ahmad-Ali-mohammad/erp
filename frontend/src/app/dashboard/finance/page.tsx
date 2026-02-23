"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { AccountingTree } from "@/components/accounting/accounting-tree";
import { accountingHierarchyRoot } from "@/lib/accounting-hierarchy";
import { request } from "@/lib/api-client";

type KpisResponse = {
  masters: {
    customers: number;
    vendors: number;
    items: number;
  };
  sales: {
    quotations: number;
    orders: number;
    invoices: number;
    posted_total: string;
  };
  procurement: {
    purchase_invoices: number;
    posted_total: string;
  };
  treasury: {
    receipts_total: string;
    payments_total: string;
  };
};

const financeMap = [
  {
    title: "المسار الأساسي (الإصدار v2)",
    tierClass: "tier-primary",
    links: [
      { label: "العمليات اليومية (v2)", href: "/dashboard/accounting-v2/sales" },
      { label: "القيود والترحيل (v2)", href: "/dashboard/accounting-v2/gl/journal-entries" },
      { label: "التقارير المالية (v2)", href: "/dashboard/accounting-v2/reports" },
    ],
  },
  {
    title: "المسار الثانوي (النظام السابق v1)",
    tierClass: "tier-secondary",
    links: [
      { label: "العمليات المالية (v1)", href: "/dashboard/finance/operations" },
      { label: "المحاسبة والتقارير (v1)", href: "/dashboard/finance/accounting" },
      { label: "المطبوعات (v1)", href: "/dashboard/finance/printouts" },
    ],
  },
];

export default function FinanceIndexPage() {
  const kpis = useQuery({
    queryKey: ["finance-v2-entry-kpis"],
    queryFn: () => request<KpisResponse>("/v2/reports/kpis/"),
    staleTime: 60_000,
  });

  return (
    <section className="resource-section">
      <header className="resource-header">
        <div>
          <h3>نظرة عامة عن قسم المالية</h3>
          <p>ابدأ من العمليات اليومية ثم انتقل إلى المحاسبة ثم التقارير، مع إبقاء مسارات v1 كخيار للنظام السابق عند الحاجة.</p>
        </div>
      </header>

      <div className="hero-actions" style={{ marginTop: "0.8rem" }}>
        <Link className="btn btn-primary" href="/dashboard/finance/operations">
          ابدأ من العمليات
        </Link>
        <Link className="btn btn-outline" href="/dashboard/accounting-v2/gl/journal-entries">
          أضف قيد فردي
        </Link>
        <Link className="btn btn-outline" href="/dashboard/finance/guides/overview">
          تعليمات الاستخدام
        </Link>
      </div>

      {kpis.isError ? <p className="error-banner">تعذر تحميل ملخص مؤشرات المالية.</p> : null}

      {kpis.data ? (
        <section className="dashboard-grid" style={{ marginTop: "0.8rem" }}>
          <article className="kpi-card">
            <p className="kpi-label">العملاء</p>
            <p className="kpi-value">{kpis.data.masters.customers}</p>
          </article>
          <article className="kpi-card">
            <p className="kpi-label">الموردون</p>
            <p className="kpi-value">{kpis.data.masters.vendors}</p>
          </article>
          <article className="kpi-card">
            <p className="kpi-label">إجمالي المبيعات المرحلة</p>
            <p className="kpi-value">{kpis.data.sales.posted_total}</p>
          </article>
          <article className="kpi-card">
            <p className="kpi-label">إجمالي المشتريات المرحلة</p>
            <p className="kpi-value">{kpis.data.procurement.posted_total}</p>
          </article>
        </section>
      ) : null}

      <section className="priority-grid" style={{ marginTop: "0.8rem" }}>
        {financeMap.map((group) => (
          <article className="priority-card" key={group.title}>
            <div className={`priority-chip ${group.tierClass}`}>{group.title}</div>
            {group.links.map((link) => (
              <Link key={link.href} href={link.href} className="btn btn-outline">
                {link.label}
              </Link>
            ))}
          </article>
        ))}
      </section>

      <AccountingTree root={accountingHierarchyRoot} />
    </section>
  );
}
