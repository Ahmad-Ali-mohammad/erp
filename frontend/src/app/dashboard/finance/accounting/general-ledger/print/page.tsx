"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { PrintLayout } from "@/components/print/print-layout";
import { usePrintAssets } from "@/components/print/use-print-assets";
import { request } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/format";
import type { LedgerAccountGroup } from "@/lib/entities";

import { currentMonthRange } from "../../_lib";

type LedgerResponse = {
  rows: LedgerAccountGroup[];
};

export default function GeneralLedgerPrintPage() {
  const searchParams = useSearchParams();
  const defaultRange = currentMonthRange();
  const startDate = searchParams.get("start_date") ?? defaultRange.startDate;
  const endDate = searchParams.get("end_date") ?? defaultRange.endDate;

  const { settings, profile, isLoading: assetsLoading, errorMessage: assetsError } = usePrintAssets();

  const query = useQuery({
    queryKey: ["print-general-ledger", startDate, endDate],
    queryFn: () =>
      request<LedgerResponse>(
        `/v1/finance/reports/general-ledger/?start_date=${startDate}&end_date=${endDate}`,
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
        <Link className="btn btn-outline" href="/dashboard/finance/accounting/general-ledger">
          رجوع إلى التقرير
        </Link>
      </div>

      <PrintLayout
        settings={settings}
        profile={profile}
        title="دفتر الأستاذ"
        subtitle="كشف حسابات الأستاذ العام"
        meta={
          <>
            <div>من: {startDate}</div>
            <div>إلى: {endDate}</div>
            <div>عدد الحسابات: {rows.length}</div>
          </>
        }
      >
        {rows.length === 0 ? (
          <p>لا توجد حسابات للفترة المحددة.</p>
        ) : (
          rows.map((group) => (
            <div key={group.account_id} style={{ marginBottom: "1rem" }}>
              <h4 style={{ marginTop: 0, marginBottom: "0.4rem" }}>
                {group.account_code} - {group.account_name}
              </h4>
              <div className="print-summary" style={{ marginBottom: "0.6rem" }}>
                <div className="print-summary-card">
                  <strong>افتتاحي</strong>
                  <p>{formatCurrency(group.opening_balance)}</p>
                </div>
                <div className="print-summary-card">
                  <strong>حركة مدين</strong>
                  <p>{formatCurrency(group.period_debit)}</p>
                </div>
                <div className="print-summary-card">
                  <strong>حركة دائن</strong>
                  <p>{formatCurrency(group.period_credit)}</p>
                </div>
                <div className="print-summary-card">
                  <strong>ختامي</strong>
                  <p>{formatCurrency(group.closing_balance)}</p>
                </div>
              </div>
              <table className="print-table">
                <thead>
                  <tr>
                    <th>رقم القيد</th>
                    <th>التاريخ</th>
                    <th>البيان</th>
                    <th>مدين</th>
                    <th>دائن</th>
                    <th>الرصيد الجاري</th>
                  </tr>
                </thead>
                <tbody>
                  {group.movements.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="table-empty">
                        لا توجد حركة على هذا الحساب.
                      </td>
                    </tr>
                  ) : (
                    group.movements.map((movement, index) => (
                      <tr key={`${movement.entry_id}-${index}`}>
                        <td>{movement.entry_number}</td>
                        <td>{formatDate(movement.entry_date)}</td>
                        <td>{movement.description || "-"}</td>
                        <td>{formatCurrency(movement.debit)}</td>
                        <td>{formatCurrency(movement.credit)}</td>
                        <td>{formatCurrency(movement.running_balance)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ))
        )}
      </PrintLayout>
    </div>
  );
}
