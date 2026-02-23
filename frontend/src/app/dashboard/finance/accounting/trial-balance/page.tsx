"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";

import { BarChart, ChartCard } from "@/components/charts/chart-kit";
import { request } from "@/lib/api-client";
import { formatCurrency } from "@/lib/format";
import type { TrialBalanceRow } from "@/lib/entities";

import { currentMonthRange } from "../_lib";

type TrialBalanceResponse = {
  rows: TrialBalanceRow[];
  totals: {
    closing_debit: string;
    closing_credit: string;
  };
  is_balanced: boolean;
};

export default function TrialBalancePage() {
  const defaultRange = useMemo(() => currentMonthRange(), []);
  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);

  const query = useQuery({
    queryKey: ["accounting-trial-balance", startDate, endDate],
    queryFn: () =>
      request<TrialBalanceResponse>(
        `/v1/finance/reports/trial-balance/?start_date=${startDate}&end_date=${endDate}`,
      ),
  });

  const errorMessage = query.error instanceof Error ? query.error.message : "";
  const rows = query.data?.rows ?? [];

  const topRows = [...rows]
    .map((row) => ({
      label: `${row.account_code} - ${row.account_name}`,
      value: Math.abs(Number(row.closing_debit) - Number(row.closing_credit)),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const chartData = {
    labels: topRows.map((row) => row.label),
    datasets: [
      {
        label: "أعلى الحسابات",
        data: topRows.map((row) => row.value),
        backgroundColor: "#1a5bb8",
      },
    ],
  };

  return (
    <div>
      <div className="resource-toolbar" style={{ marginTop: 0 }}>
        <input
          type="date"
          className="field-control"
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
        />
        <input
          type="date"
          className="field-control"
          value={endDate}
          onChange={(event) => setEndDate(event.target.value)}
        />
        <button type="button" className="btn btn-outline" onClick={() => query.refetch()}>
          تحديث
        </button>
        <Link
          className="btn btn-outline"
          href={`/dashboard/finance/accounting/trial-balance/print?start_date=${startDate}&end_date=${endDate}`}
          target="_blank"
        >
          طباعة
        </Link>
      </div>

      {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}

      <p style={{ marginTop: "0.7rem", color: "var(--text-soft)" }}>
        حالة التوازن: {query.data?.is_balanced ? "متوازن" : "غير متوازن"}
      </p>

      {rows.length > 0 ? (
        <section className="chart-grid" style={{ marginTop: "0.7rem" }}>
          <ChartCard title="أعلى الحسابات حركة" subtitle="حسب الرصيد الختامي">
            <BarChart data={chartData} options={{ plugins: { legend: { display: false } } }} />
          </ChartCard>
        </section>
      ) : null}

      <div className="table-scroll">
        <table className="resource-table">
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
            {query.isLoading ? (
              <tr>
                <td className="table-empty" colSpan={7}>
                  جاري تحميل ميزان المراجعة...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="table-empty" colSpan={7}>
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
      </div>

      <div className="hero-actions" style={{ marginTop: "0.7rem" }}>
        <span className="json-editor-chip">إجمالي المدين: {formatCurrency(query.data?.totals.closing_debit ?? 0)}</span>
        <span className="json-editor-chip">إجمالي الدائن: {formatCurrency(query.data?.totals.closing_credit ?? 0)}</span>
      </div>
    </div>
  );
}
