"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { PrintLayout } from "@/components/print/print-layout";
import { usePrintAssets } from "@/components/print/use-print-assets";
import { request } from "@/lib/api-client";
import { formatCurrency } from "@/lib/format";
import type { IncomeStatementRow } from "@/lib/entities";

import { currentMonthRange } from "../../_lib";

type IncomeStatementResponse = {
  revenues: IncomeStatementRow[];
  expenses: IncomeStatementRow[];
  summary: {
    total_revenue: string;
    total_expense: string;
    net_profit_or_loss: string;
  };
};

export default function IncomeStatementPrintPage() {
  const searchParams = useSearchParams();
  const defaultRange = currentMonthRange();
  const startDate = searchParams.get("start_date") ?? defaultRange.startDate;
  const endDate = searchParams.get("end_date") ?? defaultRange.endDate;

  const { settings, profile, isLoading: assetsLoading, errorMessage: assetsError } = usePrintAssets();

  const query = useQuery({
    queryKey: ["print-income-statement", startDate, endDate],
    queryFn: () =>
      request<IncomeStatementResponse>(
        `/v1/finance/reports/income-statement/?start_date=${startDate}&end_date=${endDate}`,
      ),
  });

  if (assetsLoading || query.isLoading) {
    return <p>جاري تجهيز بيانات الطباعة...</p>;
  }

  if (assetsError || query.error || !settings) {
    return <p className="error-banner">تعذر تحميل بيانات الطباعة.</p>;
  }

  const revenues = query.data?.revenues ?? [];
  const expenses = query.data?.expenses ?? [];

  return (
    <div>
      <div className="hero-actions no-print" style={{ marginBottom: "0.8rem" }}>
        <button type="button" className="btn btn-primary" onClick={() => window.print()}>
          طباعة
        </button>
        <Link className="btn btn-outline" href="/dashboard/finance/accounting/income-statement">
          رجوع إلى التقرير
        </Link>
      </div>

      <PrintLayout
        settings={settings}
        profile={profile}
        title="قائمة الدخل"
        subtitle="إجمالي الإيرادات والمصروفات"
        meta={
          <>
            <div>من: {startDate}</div>
            <div>إلى: {endDate}</div>
            <div>صافي: {formatCurrency(query.data?.summary.net_profit_or_loss ?? 0)}</div>
          </>
        }
      >
        <section className="print-summary">
          <div className="print-summary-card">
            <strong>إجمالي الإيرادات</strong>
            <p>{formatCurrency(query.data?.summary.total_revenue ?? 0)}</p>
          </div>
          <div className="print-summary-card">
            <strong>إجمالي المصروفات</strong>
            <p>{formatCurrency(query.data?.summary.total_expense ?? 0)}</p>
          </div>
          <div className="print-summary-card">
            <strong>صافي الربح/الخسارة</strong>
            <p>{formatCurrency(query.data?.summary.net_profit_or_loss ?? 0)}</p>
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
            {revenues.length + expenses.length === 0 ? (
              <tr>
                <td colSpan={3} className="table-empty">
                  لا توجد بيانات.
                </td>
              </tr>
            ) : (
              <>
                {revenues.map((row) => (
                  <tr key={`revenue-${row.account_id}`}>
                    <td>إيراد</td>
                    <td>
                      {row.code} - {row.name}
                    </td>
                    <td>{formatCurrency(row.amount)}</td>
                  </tr>
                ))}
                {expenses.map((row) => (
                  <tr key={`expense-${row.account_id}`}>
                    <td>مصروف</td>
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
