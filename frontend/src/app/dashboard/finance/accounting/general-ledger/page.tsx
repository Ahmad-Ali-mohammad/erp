"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";

import { ChartCard, LineChart } from "@/components/charts/chart-kit";
import { request } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/format";
import type { LedgerAccountGroup } from "@/lib/entities";

import { currentMonthRange } from "../_lib";

type LedgerResponse = {
  rows: LedgerAccountGroup[];
};

export default function GeneralLedgerPage() {
  const defaultRange = useMemo(() => currentMonthRange(), []);
  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);

  const query = useQuery({
    queryKey: ["accounting-general-ledger", startDate, endDate],
    queryFn: () =>
      request<LedgerResponse>(
        `/v1/finance/reports/general-ledger/?start_date=${startDate}&end_date=${endDate}`,
      ),
  });

  const errorMessage = query.error instanceof Error ? query.error.message : "";
  const rows = query.data?.rows ?? [];
  const effectiveSelectedAccountId = selectedAccountId ?? rows[0]?.account_id ?? null;
  const selectedGroup = rows.find((group) => group.account_id === effectiveSelectedAccountId) ?? rows[0];
  const chartData = selectedGroup
    ? {
        labels: selectedGroup.movements.map((movement) => formatDate(movement.entry_date)),
        datasets: [
          {
            label: `${selectedGroup.account_code} - ${selectedGroup.account_name}`,
            data: selectedGroup.movements.map((movement) => Number(movement.running_balance)),
            borderColor: "#1a5bb8",
            backgroundColor: "rgba(26, 91, 184, 0.12)",
            tension: 0.3,
            fill: true,
          },
        ],
      }
    : { labels: [], datasets: [] };

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
          href={`/dashboard/finance/accounting/general-ledger/print?start_date=${startDate}&end_date=${endDate}`}
          target="_blank"
        >
          طباعة
        </Link>
        {rows.length > 0 ? (
          <select
            className="field-control select-control"
            value={effectiveSelectedAccountId ?? ""}
            onChange={(event) => setSelectedAccountId(Number(event.target.value))}
          >
            {rows.map((group) => (
              <option key={group.account_id} value={group.account_id}>
                {group.account_code} - {group.account_name}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}

      {selectedGroup ? (
        <section className="chart-grid" style={{ marginTop: "0.7rem" }}>
          <ChartCard title="رصيد الحساب الجاري" subtitle="تطور الرصيد خلال الفترة">
            <LineChart data={chartData} />
          </ChartCard>
        </section>
      ) : null}

      {query.isLoading ? <p style={{ marginTop: "0.7rem" }}>جاري تحميل دفتر الأستاذ...</p> : null}
      {!query.isLoading && rows.length === 0 ? (
        <p style={{ marginTop: "0.7rem" }}>لا توجد حسابات للفترة المحددة.</p>
      ) : null}

      {rows.map((group) => (
        <div key={group.account_id} className="kpi-card" style={{ marginTop: "0.75rem" }}>
          <h4 style={{ marginTop: 0, marginBottom: "0.35rem" }}>
            {group.account_code} - {group.account_name}
          </h4>
          <div className="hero-actions" style={{ marginBottom: "0.55rem" }}>
            <span className="json-editor-chip">افتتاحي: {formatCurrency(group.opening_balance)}</span>
            <span className="json-editor-chip">حركة مدين: {formatCurrency(group.period_debit)}</span>
            <span className="json-editor-chip">حركة دائن: {formatCurrency(group.period_credit)}</span>
            <span className="json-editor-chip">ختامي: {formatCurrency(group.closing_balance)}</span>
          </div>

          <div className="table-scroll">
            <table className="resource-table">
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
        </div>
      ))}
    </div>
  );
}
