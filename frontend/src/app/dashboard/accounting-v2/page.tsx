"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { AccountingTree } from "@/components/accounting/accounting-tree";
import { accountingHierarchyRoot } from "@/lib/accounting-hierarchy";
import { request } from "@/lib/api-client";

type KpisResponse = {
  masters: { customers: number; vendors: number; items: number };
  sales: { quotations: number; orders: number; invoices: number; posted_total: string };
  procurement: { purchase_invoices: number; posted_total: string };
  treasury: { receipts_total: string; payments_total: string };
};

const sections = [
  {
    href: "/dashboard/accounting-v2/setup",
    title: "التهيئة",
    description: "شجرة الحسابات، مراكز التكلفة، والبيانات الأساسية.",
  },
  {
    href: "/dashboard/accounting-v2/sales",
    title: "المبيعات",
    description: "عروض أسعار، أوامر بيع، فواتير بيع، ونقطة بيع.",
  },
  {
    href: "/dashboard/accounting-v2/procurement",
    title: "المشتريات",
    description: "أوامر شراء، استلامات، وفواتير مشتريات.",
  },
  {
    href: "/dashboard/accounting-v2/inventory",
    title: "المخزون",
    description: "حركات مخزون، جرد دوري، وتسويات مخزنية.",
  },
  {
    href: "/dashboard/accounting-v2/treasury",
    title: "الخزينة",
    description: "سندات قبض ودفع ودورة حياة الشيكات.",
  },
  {
    href: "/dashboard/accounting-v2/banking",
    title: "البنوك",
    description: "استيراد ملف CSV وتنفيذ التسوية البنكية.",
  },
  {
    href: "/dashboard/accounting-v2/gl",
    title: "الأستاذ العام",
    description: "قيود يومية، ترحيل، وضوابط محاسبية.",
  },
  {
    href: "/dashboard/accounting-v2/reports",
    title: "التقارير",
    description: "ميزان مراجعة، قائمة دخل، ميزانية، أعمار ذمم، وربحية.",
  },
];

export default function AccountingV2OverviewPage() {
  const kpis = useQuery({
    queryKey: ["v2-kpis"],
    queryFn: () => request<KpisResponse>("/v2/reports/kpis/"),
    staleTime: 60_000,
  });

  return (
    <section className="resource-section">
      <header className="resource-header">
        <div>
          <h3>نظرة عامة على المحاسبة v2</h3>
          <p>نظام محاسبي هرمي مترابط يبدأ من قيد فردي ثم يتوسع عبر وحدات التشغيل والتقارير.</p>
        </div>
      </header>

      <div className="hero-actions" style={{ marginTop: "0.8rem" }}>
        <Link className="btn btn-primary" href="/dashboard/accounting-v2/gl/journal-entries">
          إضافة قيد فردي
        </Link>
        <Link className="btn btn-outline" href="/dashboard/accounting-v2/sales">
          ابدأ من العمليات
        </Link>
        <Link className="btn btn-outline" href="/dashboard/finance/guides/overview">
          تعليمات الاستخدام
        </Link>
      </div>

      {kpis.data ? (
        <div className="kpi-grid" style={{ marginBottom: "0.75rem", marginTop: "0.8rem" }}>
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
        </div>
      ) : null}

      {kpis.isError ? <p className="error-banner">تعذر تحميل ملخص مؤشرات المحاسبة.</p> : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "0.75rem" }}>
        {sections.map((section) => (
          <Link key={section.href} href={section.href} className="kpi-card" style={{ textDecoration: "none" }}>
            <p className="kpi-label">{section.title}</p>
            <p style={{ marginTop: "0.45rem", color: "var(--text-soft)", lineHeight: 1.4 }}>{section.description}</p>
          </Link>
        ))}
      </div>

      <AccountingTree root={accountingHierarchyRoot} />
    </section>
  );
}
