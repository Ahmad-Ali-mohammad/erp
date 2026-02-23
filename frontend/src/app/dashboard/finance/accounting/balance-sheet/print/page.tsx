"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { PrintLayout } from "@/components/print/print-layout";
import { usePrintAssets } from "@/components/print/use-print-assets";
import { request } from "@/lib/api-client";
import { formatCurrency } from "@/lib/format";
import type { BalanceSheetSection } from "@/lib/entities";

import { toIsoDate } from "../../_lib";

export default function BalanceSheetPrintPage() {
  const searchParams = useSearchParams();
  const fallbackDate = toIsoDate(new Date());
  const asOfDate = searchParams.get("as_of_date") ?? fallbackDate;

  const { settings, profile, isLoading: assetsLoading, errorMessage: assetsError } = usePrintAssets();

  const query = useQuery({
    queryKey: ["print-balance-sheet", asOfDate],
    queryFn: () => request<BalanceSheetSection>(`/v1/finance/reports/balance-sheet/?as_of_date=${asOfDate}`),
  });

  if (assetsLoading || query.isLoading) {
    return <p>جاري تجهيز بيانات الطباعة...</p>;
  }

  if (assetsError || query.error || !settings) {
    return <p className="error-banner">تعذر تحميل بيانات الطباعة.</p>;
  }

  const assets = query.data?.assets ?? [];
  const liabilities = query.data?.liabilities ?? [];
  const equity = query.data?.equity ?? [];

  return (
    <div>
      <div className="hero-actions no-print" style={{ marginBottom: "0.8rem" }}>
        <button type="button" className="btn btn-primary" onClick={() => window.print()}>
          طباعة
        </button>
        <Link className="btn btn-outline" href="/dashboard/finance/accounting/balance-sheet">
          رجوع إلى التقرير
        </Link>
      </div>

      <PrintLayout
        settings={settings}
        profile={profile}
        title="الميزانية العمومية"
        subtitle="أصول وخصوم وحقوق ملكية"
        meta={
          <>
            <div>كما في: {asOfDate}</div>
            <div>المعادلة: {query.data?.totals.is_balanced ? "متوازنة" : "غير متوازنة"}</div>
          </>
        }
      >
        <section className="print-summary">
          <div className="print-summary-card">
            <strong>إجمالي الأصول</strong>
            <p>{formatCurrency(query.data?.totals.assets ?? 0)}</p>
          </div>
          <div className="print-summary-card">
            <strong>إجمالي الخصوم</strong>
            <p>{formatCurrency(query.data?.totals.liabilities ?? 0)}</p>
          </div>
          <div className="print-summary-card">
            <strong>حقوق الملكية</strong>
            <p>{formatCurrency(query.data?.totals.equity ?? 0)}</p>
          </div>
        </section>

        <table className="print-table">
          <thead>
            <tr>
              <th>الفئة</th>
              <th>الحساب</th>
              <th>الرصيد</th>
            </tr>
          </thead>
          <tbody>
            {[...assets.map((row) => ({ ...row, group: "أصول" })), ...liabilities.map((row) => ({ ...row, group: "خصوم" })), ...equity.map((row) => ({ ...row, group: "حقوق ملكية" }))].length === 0 ? (
              <tr>
                <td colSpan={3} className="table-empty">
                  لا توجد بيانات.
                </td>
              </tr>
            ) : (
              <>
                {assets.map((row) => (
                  <tr key={`asset-${row.account_id}`}>
                    <td>أصول</td>
                    <td>
                      {row.code} - {row.name}
                    </td>
                    <td>{formatCurrency(row.amount)}</td>
                  </tr>
                ))}
                {liabilities.map((row) => (
                  <tr key={`liability-${row.account_id}`}>
                    <td>خصوم</td>
                    <td>
                      {row.code} - {row.name}
                    </td>
                    <td>{formatCurrency(row.amount)}</td>
                  </tr>
                ))}
                {equity.map((row) => (
                  <tr key={`equity-${row.account_id}`}>
                    <td>حقوق ملكية</td>
                    <td>
                      {row.code} - {row.name}
                    </td>
                    <td>{formatCurrency(row.amount)}</td>
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>
      </PrintLayout>
    </div>
  );
}
