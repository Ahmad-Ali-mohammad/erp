"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { PrintLayout } from "@/components/print/print-layout";
import { usePrintAssets } from "@/components/print/use-print-assets";
import { request } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/format";

import { currentMonthRange } from "../../_lib";

type JournalReportRow = {
  id: number;
  entry_number: string;
  entry_date: string;
  entry_class: string;
  description: string;
  source_module: string;
  source_event: string;
  total_debit: string;
  total_credit: string;
};

type GeneralJournalResponse = {
  rows: JournalReportRow[];
  count: number;
};

export default function GeneralJournalPrintPage() {
  const searchParams = useSearchParams();
  const defaultRange = currentMonthRange();
  const startDate = searchParams.get("start_date") ?? defaultRange.startDate;
  const endDate = searchParams.get("end_date") ?? defaultRange.endDate;

  const { settings, profile, isLoading: assetsLoading, errorMessage: assetsError } = usePrintAssets();

  const query = useQuery({
    queryKey: ["print-general-journal", startDate, endDate],
    queryFn: () =>
      request<GeneralJournalResponse>(
        `/v1/finance/reports/general-journal/?start_date=${startDate}&end_date=${endDate}`,
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
        <Link className="btn btn-outline" href="/dashboard/finance/accounting/journal">
          رجوع إلى التقرير
        </Link>
      </div>

      <PrintLayout
        settings={settings}
        profile={profile}
        title="دفتر اليومية"
        subtitle="تقرير القيود المرحلة"
        meta={
          <>
            <div>من: {startDate}</div>
            <div>إلى: {endDate}</div>
            <div>عدد القيود: {rows.length}</div>
          </>
        }
      >
        <table className="print-table">
          <thead>
            <tr>
              <th>رقم القيد</th>
              <th>التاريخ</th>
              <th>النوع</th>
              <th>المصدر</th>
              <th>البيان</th>
              <th>إجمالي المدين</th>
              <th>إجمالي الدائن</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="table-empty">
                  لا توجد قيود خلال الفترة المحددة.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.entry_number}</td>
                  <td>{formatDate(row.entry_date)}</td>
                  <td>{row.entry_class}</td>
                  <td>
                    {row.source_module || "-"}
                    {row.source_event ? ` / ${row.source_event}` : ""}
                  </td>
                  <td>{row.description || "-"}</td>
                  <td>{formatCurrency(row.total_debit)}</td>
                  <td>{formatCurrency(row.total_credit)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </PrintLayout>
    </div>
  );
}
