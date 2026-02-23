"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";

import { request } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/format";

import { currentMonthRange } from "../_lib";

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

export default function AccountingJournalPage() {
  const defaultRange = useMemo(() => currentMonthRange(), []);
  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);

  const query = useQuery({
    queryKey: ["accounting-general-journal", startDate, endDate],
    queryFn: () =>
      request<GeneralJournalResponse>(
        `/v1/finance/reports/general-journal/?start_date=${startDate}&end_date=${endDate}`,
      ),
  });

  const errorMessage = query.error instanceof Error ? query.error.message : "";
  const rows = query.data?.rows ?? [];

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
          href={`/dashboard/finance/accounting/journal/print?start_date=${startDate}&end_date=${endDate}`}
          target="_blank"
        >
          طباعة
        </Link>
      </div>

      {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}

      <div className="table-scroll">
        <table className="resource-table">
          <thead>
            <tr>
              <th>رقم القيد</th>
              <th>التاريخ</th>
              <th>نوع القيد</th>
              <th>المصدر</th>
              <th>البيان</th>
              <th>إجمالي المدين</th>
              <th>إجمالي الدائن</th>
            </tr>
          </thead>
          <tbody>
            {query.isLoading ? (
              <tr>
                <td className="table-empty" colSpan={7}>
                  جاري تحميل دفتر اليومية...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="table-empty" colSpan={7}>
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
      </div>
    </div>
  );
}
