"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";

import { BarChart, ChartCard } from "@/components/charts/chart-kit";
import { request } from "@/lib/api-client";
import { formatCurrency } from "@/lib/format";
import type { IncomeStatementRow } from "@/lib/entities";

import { currentMonthRange } from "../_lib";

type IncomeStatementResponse = {
  revenues: IncomeStatementRow[];
  expenses: IncomeStatementRow[];
  summary: {
    total_revenue: string;
    total_expense: string;
    net_profit_or_loss: string;
  };
};

export default function IncomeStatementPage() {
  const defaultRange = useMemo(() => currentMonthRange(), []);
  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);

  const query = useQuery({
    queryKey: ["accounting-income-statement", startDate, endDate],
    queryFn: () =>
      request<IncomeStatementResponse>(
        `/v1/finance/reports/income-statement/?start_date=${startDate}&end_date=${endDate}`,
      ),
  });

  const errorMessage = query.error instanceof Error ? query.error.message : "";

  const chartData = {
    labels: ["الإيرادات", "المصروفات", "صافي الربح/الخسارة"],
    datasets: [
      {
        label: "القيم",
        data: [
          Number(query.data?.summary.total_revenue ?? 0),
          Number(query.data?.summary.total_expense ?? 0),
          Number(query.data?.summary.net_profit_or_loss ?? 0),
        ],
        backgroundColor: ["#1e8e5a", "#c62828", "#1a5bb8"],
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
          href={`/dashboard/finance/accounting/income-statement/print?start_date=${startDate}&end_date=${endDate}`}
          target="_blank"
        >
          طباعة
        </Link>
      </div>

      {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}

      <div className="dashboard-grid" style={{ marginTop: "0.8rem" }}>
        <article className="kpi-card">
          <p className="kpi-label">إجمالي الإيرادات</p>
          <p className="kpi-value">{formatCurrency(query.data?.summary.total_revenue ?? 0)}</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">إجمالي المصروفات</p>
          <p className="kpi-value">{formatCurrency(query.data?.summary.total_expense ?? 0)}</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">صافي ربح/خسارة</p>
          <p className="kpi-value">{formatCurrency(query.data?.summary.net_profit_or_loss ?? 0)}</p>
        </article>
      </div>

      {query.data ? (
        <section className="chart-grid" style={{ marginTop: "0.8rem" }}>
          <ChartCard title="ملخص قائمة الدخل" subtitle="الإيرادات مقابل المصروفات">
            <BarChart data={chartData} options={{ plugins: { legend: { display: false } } }} />
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
                  جاري تحميل قائمة الدخل...
                </td>
              </tr>
            ) : (
              <>
                {(query.data?.revenues ?? []).map((row) => (
                  <tr key={`revenue-${row.account_id}`}>
                    <td>إيراد</td>
                    <td>
                      {row.code} - {row.name}
                    </td>
                    <td>{formatCurrency(row.amount)}</td>
                  </tr>
                ))}
                {(query.data?.expenses ?? []).map((row) => (
                  <tr key={`expense-${row.account_id}`}>
                    <td>مصروف</td>
                    <td>
                      {row.code} - {row.name}
                    </td>
                    <td>{formatCurrency(row.amount)}</td>
                  </tr>
                ))}
                {(query.data?.revenues.length ?? 0) + (query.data?.expenses.length ?? 0) === 0 ? (
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
