"use client";

import { FormEvent, useState } from "react";
import { useMutation } from "@tanstack/react-query";

import { request } from "@/lib/api-client";

export default function AccountingV2BankingPage() {
  const [statementId, setStatementId] = useState("");
  const [result, setResult] = useState<{ matched_count: number; unmatched_count: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reconcile = useMutation({
    mutationFn: () => request<{ matched_count: number; unmatched_count: number }>("/v2/banking/reconciliations/run/", "POST", { statement: Number(statementId) }),
    onSuccess: (data) => {
      setError(null);
      setResult(data);
    },
    onError: (mutationError) => {
      setResult(null);
      setError(mutationError instanceof Error ? mutationError.message : "فشلت عملية التسوية البنكية.");
    },
  });

  const importCsv = useMutation({
    mutationFn: async (payload: { file: File; statement_date: string }) => {
      const form = new FormData();
      form.append("file", payload.file);
      if (payload.statement_date) {
        form.append("statement_date", payload.statement_date);
      }
      const response = await fetch("/api/backend/v2/banking/statements/import-csv/", {
        method: "POST",
        credentials: "same-origin",
        body: form,
      });
      if (!response.ok) {
        const payloadBody = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(payloadBody?.detail ?? "فشل استيراد ملف CSV.");
      }
      return response.json() as Promise<{ id: number }>;
    },
    onSuccess: (data) => {
      setError(null);
      setStatementId(String(data.id));
    },
    onError: (mutationError) => {
      setError(mutationError instanceof Error ? mutationError.message : "فشل استيراد ملف CSV.");
    },
  });

  const handleImport = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const fileInput = form.elements.namedItem("statement_file") as HTMLInputElement | null;
    const dateInput = form.elements.namedItem("statement_date") as HTMLInputElement | null;
    const file = fileInput?.files?.[0];
    if (!file) {
      setError("يرجى اختيار ملف CSV.");
      return;
    }
    importCsv.mutate({ file, statement_date: dateInput?.value ?? "" });
  };

  const handleReconcile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!statementId) {
      setError("رقم كشف البنك مطلوب.");
      return;
    }
    reconcile.mutate();
  };

  return (
    <section className="resource-section">
      <header className="resource-header">
        <div>
          <h3>استيراد كشف البنك والتسوية</h3>
          <p>ارفع كشف البنك بصيغة CSV ثم شغّل المطابقة مع سندات الخزينة وقيود الأستاذ العام.</p>
        </div>
      </header>

      <form className="resource-form" onSubmit={handleImport}>
        <div className="resource-form-grid">
          <label>
            <span>تاريخ الكشف</span>
            <input name="statement_date" type="date" />
          </label>
          <label>
            <span>ملف CSV</span>
            <input name="statement_file" type="file" accept=".csv,text/csv" required />
          </label>
        </div>
        <div className="resource-form-actions" style={{ marginTop: "0.8rem" }}>
          <button type="submit" className="btn btn-primary" disabled={importCsv.isPending}>
            {importCsv.isPending ? "جاري الاستيراد..." : "استيراد الملف"}
          </button>
        </div>
      </form>

      <form className="resource-form" style={{ marginTop: "1rem" }} onSubmit={handleReconcile}>
        <div className="resource-form-grid">
          <label>
            <span>رقم كشف البنك</span>
            <input value={statementId} onChange={(event) => setStatementId(event.target.value)} placeholder="مثال: 12" required />
          </label>
        </div>
        <div className="resource-form-actions" style={{ marginTop: "0.8rem" }}>
          <button type="submit" className="btn btn-primary" disabled={reconcile.isPending}>
            {reconcile.isPending ? "جاري التنفيذ..." : "تشغيل التسوية"}
          </button>
        </div>
      </form>

      {error ? <p className="error-banner" style={{ marginTop: "0.8rem" }}>{error}</p> : null}
      {result ? (
        <div className="kpi-grid" style={{ marginTop: "0.8rem" }}>
          <article className="kpi-card">
            <p className="kpi-label">عمليات مطابقة</p>
            <p className="kpi-value">{result.matched_count}</p>
          </article>
          <article className="kpi-card">
            <p className="kpi-label">عمليات غير مطابقة</p>
            <p className="kpi-value">{result.unmatched_count}</p>
          </article>
        </div>
      ) : null}
    </section>
  );
}
