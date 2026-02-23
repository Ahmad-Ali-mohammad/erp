"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { ResourceCrudPage } from "@/components/resource/resource-crud-page";
import { request } from "@/lib/api-client";
import type { FiscalPeriod } from "@/lib/entities";

export default function PeriodClosePage() {
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [message, setMessage] = useState("");

  const yearCloseMutation = useMutation({
    mutationFn: async (yearValue: string) => request(`/v1/finance/year-close/${yearValue}/run/`, "POST", {}),
    onSuccess: () => setMessage("success: تم تنفيذ الإقفال السنوي بنجاح."),
    onError: (error) => {
      const text = error instanceof Error ? error.message : "تعذر تنفيذ الإقفال السنوي.";
      setMessage(text);
    },
  });
  const isSuccess = message.startsWith("success:");

  return (
    <div>
      <ResourceCrudPage<FiscalPeriod>
        title="إقفال الفترات المحاسبية"
        description="إدارة الفترات المحاسبية وفتح/إقفال الفترة بشكل مرن أو نهائي."
        resourcePath="/v1/finance/periods/"
        searchPlaceholder="ابحث برقم السنة أو الشهر"
        columns={[
          { key: "year", title: "السنة" },
          { key: "month", title: "الشهر" },
          { key: "start_date", title: "من" },
          { key: "end_date", title: "إلى" },
        ]}
        fields={[
          { name: "year", label: "السنة", type: "number", required: true },
          {
            name: "month",
            label: "الشهر",
            type: "number",
            required: true,
            helpText: "أدخل رقم الشهر من 1 إلى 12.",
          },
          { name: "start_date", label: "تاريخ البداية", type: "date", required: true },
          { name: "end_date", label: "تاريخ النهاية", type: "date", required: true },
        ]}
        actions={[
          { label: "إقفال مرن", action: "soft-close", variant: "warning", requiredPermissionLevel: "approve" },
          { label: "إقفال نهائي", action: "hard-close", variant: "danger", requiredPermissionLevel: "approve" },
        ]}
        statusOptions={[
          { label: "الكل", value: "" },
          { label: "مفتوحة", value: "open" },
          { label: "مغلقة مرنًا", value: "soft_closed" },
          { label: "مغلقة نهائيًا", value: "hard_closed" },
        ]}
      />

      <section className="resource-section" style={{ marginTop: "0.8rem" }}>
        <header className="resource-header">
          <div>
            <h3>الإقفال السنوي</h3>
            <p>يشغل قيود الإقفال لحسابات الإيرادات والمصروفات وينقل الصافي إلى الأرباح المحتجزة.</p>
          </div>
        </header>
        <div className="resource-toolbar">
          <input
            type="number"
            className="field-control"
            value={year}
            onChange={(event) => setYear(event.target.value)}
            min={2000}
            max={2999}
          />
          <button
            type="button"
            className="btn btn-primary"
            disabled={yearCloseMutation.isPending || year.trim().length !== 4}
            onClick={() => {
              setMessage("");
              yearCloseMutation.mutate(year.trim());
            }}
          >
            {yearCloseMutation.isPending ? "جاري التنفيذ..." : "تشغيل إقفال السنة"}
          </button>
        </div>
        {message ? <p className={isSuccess ? "status-chip" : "error-banner"}>{message.replace("success:", "").trim()}</p> : null}
      </section>
    </div>
  );
}
