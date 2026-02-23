"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { PrintLayout } from "@/components/print/print-layout";
import { usePrintAssets } from "@/components/print/use-print-assets";
import { request } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/format";

type BankStatementLine = {
  id: number;
  line_date: string;
  description: string;
  reference: string;
  amount: string;
};

type BankStatementDetail = {
  id: number;
  bank_account: number;
  statement_date: string;
  opening_balance: string;
  closing_balance: string;
  status: string;
  notes?: string | null;
  lines?: BankStatementLine[];
};

type PageProps = {
  params: { id: string };
};

export default function BankStatementPrintPage({ params }: PageProps) {
  const statementId = params.id;
  const { settings, profile, isLoading: assetsLoading, errorMessage: assetsError } = usePrintAssets();

  const statementQuery = useQuery({
    queryKey: ["bank-statement-print", statementId],
    queryFn: () => request<BankStatementDetail>(`/v1/finance/bank-statements/${statementId}/`),
  });

  if (assetsLoading || statementQuery.isLoading) {
    return <p>جاري تجهيز بيانات الطباعة...</p>;
  }

  if (assetsError || statementQuery.error || !settings || !statementQuery.data) {
    return <p className="error-banner">تعذر تحميل بيانات الطباعة.</p>;
  }

  const statement = statementQuery.data;
  const lines = statement.lines ?? [];

  return (
    <div>
      <div className="hero-actions no-print" style={{ marginBottom: "0.8rem" }}>
        <button type="button" className="btn btn-primary" onClick={() => window.print()}>
          طباعة
        </button>
        <Link className="btn btn-outline" href="/dashboard/finance/accounting/bank-reconciliation">
          رجوع إلى كشوف البنك
        </Link>
      </div>

      <PrintLayout
        settings={settings}
        profile={profile}
        title="كشف حساب بنكي"
        subtitle={`تاريخ الكشف: ${formatDate(statement.statement_date)}`}
        meta={
          <>
            <div>الرصيد الافتتاحي: {formatCurrency(statement.opening_balance)}</div>
            <div>الرصيد الختامي: {formatCurrency(statement.closing_balance)}</div>
            <div>الحالة: {statement.status}</div>
          </>
        }
      >
        {statement.notes ? <p>{statement.notes}</p> : null}

        <table className="print-table">
          <thead>
            <tr>
              <th>التاريخ</th>
              <th>البيان</th>
              <th>المرجع</th>
              <th>المبلغ</th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr>
                <td colSpan={4} className="table-empty">
                  لا توجد حركات.
                </td>
              </tr>
            ) : (
              lines.map((line) => (
                <tr key={line.id}>
                  <td>{formatDate(line.line_date)}</td>
                  <td>{line.description || "-"}</td>
                  <td>{line.reference || "-"}</td>
                  <td>{formatCurrency(line.amount)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </PrintLayout>
    </div>
  );
}
