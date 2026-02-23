"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { BarChart, ChartCard } from "@/components/charts/chart-kit";
import { request } from "@/lib/api-client";
import { formatCurrency } from "@/lib/format";
import type { BalanceSheetSection } from "@/lib/entities";

import { toIsoDate } from "../_lib";

export default function BalanceSheetPage() {
  const [asOfDate, setAsOfDate] = useState(() => toIsoDate(new Date()));

  const query = useQuery({
    queryKey: ["accounting-balance-sheet", asOfDate],
    queryFn: () => request<BalanceSheetSection>(`/v1/finance/reports/balance-sheet/?as_of_date=${asOfDate}`),
  });

  const errorMessage = query.error instanceof Error ? query.error.message : "";

  const assets = query.data?.assets ?? [];
  const liabilities = query.data?.liabilities ?? [];
  const equity = query.data?.equity ?? [];

  const chartData = {
    labels: ["الميزانية العمومية"],
    datasets: [
      {
        label: "الأصول",
        data: [Number(query.data?.totals.assets ?? 0)],
        backgroundColor: "#1a5bb8",
      },
      {
        label: "الخصوم",
        data: [Number(query.data?.totals.liabilities ?? 0)],
        backgroundColor: "#c89b3c",
      },
      {
        label: "حقوق الملكية",
        data: [Number(query.data?.totals.equity ?? 0)],
        backgroundColor: "#0f2a43",
      },
    ],
  };

  return (
    <div>
      <div className="resource-toolbar" style={{ marginTop: 0 }}>
        <input
          type="date"
          className="field-control"
          value={asOfDate}
          onChange={(event) => setAsOfDate(event.target.value)}
        />
        <button type="button" className="btn btn-outline" onClick={() => query.refetch()}>
          تحديث
        </button>
        <Link
          className="btn btn-outline"
          href={`/dashboard/finance/accounting/balance-sheet/print?as_of_date=${asOfDate}`}
          target="_blank"
        >
          طباعة
        </Link>
      </div>

      {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}

      <div className="dashboard-grid" style={{ marginTop: "0.8rem" }}>
        <article className="kpi-card">
          <p className="kpi-label">إجمالي الأصول</p>
          <p className="kpi-value">{formatCurrency(query.data?.totals.assets ?? 0)}</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">إجمالي الخصوم</p>
          <p className="kpi-value">{formatCurrency(query.data?.totals.liabilities ?? 0)}</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">حقوق الملكية</p>
          <p className="kpi-value">{formatCurrency(query.data?.totals.equity ?? 0)}</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">المعادلة</p>
          <p className="kpi-value">{query.data?.totals.is_balanced ? "متوازنة" : "غير متوازنة"}</p>
        </article>
      </div>

      {query.data ? (
        <section className="chart-grid" style={{ marginTop: "0.8rem" }}>
          <ChartCard title="توزيع الميزانية العمومية" subtitle="الأصول مقابل الخصوم وحقوق الملكية">
            <BarChart data={chartData} options={{ scales: { x: { stacked: true }, y: { stacked: true } } }} />
          </ChartCard>
        </section>
      ) : null}

      <div className="table-scroll" style={{ marginTop: "0.8rem" }}>
        <table className="resource-table">
          <thead>
            <tr>
              <th>الفئة</th>
              <th>الحساب</th>
              <th>الرصيد</th>
            </tr>
          </thead>
          <tbody>
            {query.isLoading ? (
              <tr>
                <td colSpan={3} className="table-empty">
                  جاري تحميل الميزانية العمومية...
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
                {assets.length + liabilities.length + equity.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="table-empty">
                      لا توجد بيانات.
                    </td>
                  </tr>
                ) : null}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
