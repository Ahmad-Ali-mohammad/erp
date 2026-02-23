"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { PrintLayout } from "@/components/print/print-layout";
import { usePrintAssets } from "@/components/print/use-print-assets";
import { request } from "@/lib/api-client";
import { formatCurrency } from "@/lib/format";
import type { TrialBalanceRow } from "@/lib/entities";

import { currentMonthRange } from "../../_lib";

type TrialBalanceResponse = {
  rows: TrialBalanceRow[];
  totals: {
    closing_debit: string;
    closing_credit: string;
  };
  is_balanced: boolean;
};

export default function TrialBalancePrintPage() {
  const searchParams = useSearchParams();
  const defaultRange = currentMonthRange();
  const startDate = searchParams.get("start_date") ?? defaultRange.startDate;
  const endDate = searchParams.get("end_date") ?? defaultRange.endDate;

  const { settings, profile, isLoading: assetsLoading, errorMessage: assetsError } = usePrintAssets();

  const query = useQuery({
    queryKey: ["print-trial-balance", startDate, endDate],
    queryFn: () =>
      request<TrialBalanceResponse>(
        `/v1/finance/reports/trial-balance/?start_date=${startDate}&end_date=${endDate}`,
      ),
  });

  if (assetsLoading || query.isLoading) {
    return <p>جاري تجهيز بيانات الطباعة...</p>;
  }

  if (assetsError || query.error || !settings) {
    return <p className="error-banner">تعذر تحميل بيانات الطباعة.</p>;
  }

  const rows = query.data?.rows ?? [];

  return (
    <div>
      <div className="hero-actions no-print" style={{ marginBottom: "0.8rem" }}>
        <button type="button" className="btn btn-primary" onClick={() => window.print()}>
          طباعة
        </button>
        <Link className="btn btn-outline" href="/dashboard/finance/accounting/trial-balance">
          رجوع إلى التقرير
        </Link>
      </div>

      <PrintLayout
        settings={settings}
        profile={profile}
        title="ميزان المراجعة"
        subtitle="أرصدة افتتاحية وحركة ورصيد ختامي"
        meta={
          <>
            <div>من: {startDate}</div>
            <div>إلى: {endDate}</div>
            <div>الحالة: {query.data?.is_balanced ? "متوازن" : "غير متوازن"}</div>
          </>
        }
      >
        <table className="print-table">
          <thead>
            <tr>
              <th>الحساب</th>
              <th>افتتاحي مدين</th>
              <th>افتتاحي دائن</th>
              <th>حركة مدين</th>
              <th>حركة دائن</th>
              <th>ختامي مدين</th>
              <th>ختامي دائن</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="table-empty">
                  لا توجد أرصدة للفترة المحددة.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.account_id}>
                  <td>
                    {row.account_code} - {row.account_name}
                  </td>
                  <td>{formatCurrency(row.opening_debit)}</td>
                  <td>{formatCurrency(row.opening_credit)}</td>
                  <td>{formatCurrency(row.period_debit)}</td>
                  <td>{formatCurrency(row.period_credit)}</td>
                  <td>{formatCurrency(row.closing_debit)}</td>
                  <td>{formatCurrency(row.closing_credit)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <section className="print-summary">
          <div className="print-summary-card">
            <strong>إجمالي المدين</strong>
            <p>{formatCurrency(query.data?.totals.closing_debit ?? 0)}</p>
          </div>
          <div className="print-summary-card">
            <strong>إجمالي الدائن</strong>
            <p>{formatCurrency(query.data?.totals.closing_credit ?? 0)}</p>
          </div>
        </section>
      </PrintLayout>
    </div>
  );
}
