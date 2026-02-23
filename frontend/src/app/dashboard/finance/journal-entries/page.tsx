"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";

import { ResourceCrudPage } from "@/components/resource/resource-crud-page";
import { formatDate } from "@/lib/format";
import type { JournalEntry } from "@/lib/entities";

function extractFilename(contentDisposition: string | null) {
  if (!contentDisposition) return null;
  const match = /filename=\"?([^\";]+)\"?/i.exec(contentDisposition);
  return match?.[1] ?? null;
}

export default function JournalEntriesPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState("");

  const handleExport = async () => {
    setExporting(true);
    setImportMessage("");
    try {
      const response = await fetch("/api/backend/v1/finance/journal-entries/export/", {
        method: "GET",
        credentials: "same-origin",
      });
      if (!response.ok) {
        setImportMessage("تعذر تصدير القيود.");
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const filename =
        extractFilename(response.headers.get("Content-Disposition")) ||
        `journal-entries-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}.xlsx`;
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const handleTemplateDownload = async () => {
    setExporting(true);
    setImportMessage("");
    try {
      const response = await fetch("/api/backend/v1/finance/journal-entries/import-template/", {
        method: "GET",
        credentials: "same-origin",
      });
      if (!response.ok) {
        setImportMessage("تعذر تنزيل قالب الاستيراد.");
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const filename = extractFilename(response.headers.get("Content-Disposition")) || "journal-entries-template.xlsx";
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setImportMessage("اختر ملف إكسل أولًا.");
      return;
    }
    setImporting(true);
    setImportMessage("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/backend/v1/finance/journal-entries/import/", {
        method: "POST",
        body: formData,
        credentials: "same-origin",
      });
      const payload = await response.json();
      if (!response.ok) {
        const errorText = payload?.errors?.[0]?.message || payload?.detail || "تعذر استيراد القيود.";
        setImportMessage(String(errorText));
        return;
      }
      setImportMessage(`تم استيراد ${payload.created_count ?? 0} قيد بنجاح.`);
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey as Array<unknown>;
          return key[0] === "resource-crud" && key[1] === "/v1/finance/journal-entries/";
        },
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } finally {
      setImporting(false);
    }
  };

  return (
    <ResourceCrudPage<JournalEntry>
      title="القيود اليومية"
      description="ترتيب الإدخال الصحيح: (1) الحقول الأساسية، (2) الحقول المالية، (3) الحقول المرجعية/المتقدمة. بعد الترحيل استخدم عكس/تصحيح بدل التعديل أو الحذف المباشر."
      resourcePath="/v1/finance/journal-entries/"
      searchPlaceholder="ابحث برقم القيد أو البيان"
      columns={[
        { key: "entry_number", title: "رقم القيد" },
        { key: "entry_date", title: "التاريخ", render: (row) => formatDate(row.entry_date) },
        { key: "entry_class", title: "النوع" },
        { key: "description", title: "البيان" },
      ]}
      fields={[
        { name: "entry_number", label: "1) رقم القيد", type: "text", required: true, placeholder: "JE-001", helpText: "يفضل اتباع التسلسل المعتمد." },
        { name: "entry_date", label: "1) تاريخ القيد", type: "date", required: true, helpText: "تأكد أن التاريخ ضمن فترة مفتوحة." },
        { name: "description", label: "1) البيان", type: "textarea", helpText: "اشرح سبب القيد والمصدر المختصر." },
        {
          name: "entry_class",
          label: "2) نوع القيد",
          type: "select",
          required: true,
          options: [
            { label: "يدوي", value: "manual" },
            { label: "تسوية", value: "adjusting" },
            { label: "افتتاحي", value: "opening_balance" },
          ],
          defaultValue: "manual",
          helpText: "اختيار النوع يؤثر على التحليل والتقارير.",
        },
        {
          name: "status",
          label: "2) الحالة",
          type: "select",
          options: [
            { label: "مسودة", value: "draft" },
            { label: "مرحل", value: "posted" },
            { label: "معكوس", value: "reversed" },
          ],
          defaultValue: "draft",
        },
        {
          name: "project",
          label: "3) المشروع (مرجعي)",
          type: "select",
          dynamicOptions: {
            resourcePath: "/v1/projects/projects/",
            valueField: "id",
            labelFields: ["code", "name"],
            ordering: "code",
          },
        },
        {
          name: "currency",
          label: "2) العملة",
          type: "select",
          options: [
            { label: "KWD", value: "KWD" },
            { label: "USD", value: "USD" },
          ],
          defaultValue: "KWD",
        },
        {
          name: "lines",
          label: "2) سطور القيد",
          type: "json",
          required: true,
          defaultValue:
            "[\n  {\n    \"account\": 1,\n    \"description\": \"طرف مدين\",\n    \"debit\": \"100.00\",\n    \"credit\": \"0.00\"\n  },\n  {\n    \"account\": 2,\n    \"description\": \"طرف دائن\",\n    \"debit\": \"0.00\",\n    \"credit\": \"100.00\"\n  }\n]",
          jsonEditor: {
            itemLabel: "سطر",
            addLabel: "إضافة سطر",
            minItems: 2,
            columns: [
              {
                key: "account",
                label: "الحساب",
                type: "select",
                required: true,
                dynamicOptions: {
                  resourcePath: "/v1/finance/accounts/",
                  valueField: "id",
                  labelFields: ["code", "name"],
                  ordering: "code",
                },
              },
              { key: "description", label: "الوصف", type: "text" },
              { key: "debit", label: "مدين", type: "number", defaultValue: "0.00", min: 0, step: 0.01 },
              { key: "credit", label: "دائن", type: "number", defaultValue: "0.00", min: 0, step: 0.01 },
              { key: "cost_center_code", label: "مركز التكلفة", type: "text" },
            ],
          },
          helpText: "يجب أن يكون القيد متوازنًا (مدين = دائن).",
        },
      ]}
      actions={[
        { label: "ترحيل", action: "post", variant: "success", requiredPermissionLevel: "approve" },
        { label: "عكس", action: "reverse", variant: "warning", requiredPermissionLevel: "approve" },
        {
          label: "تصحيح",
          action: "correct",
          variant: "danger",
          requiredPermissionLevel: "approve",
          dialog: {
            title: "تصحيح قيد",
            description: "سيتم إنشاء قيد عكسي ثم قيد تصحيحي مرتبط بالقيد الأصلي.",
            confirmLabel: "تأكيد التصحيح",
            fields: [
              { name: "reason", label: "سبب التصحيح", type: "textarea", required: true },
              {
                name: "lines",
                label: "سطور التصحيح (بصيغة JSON)",
                type: "textarea",
                required: true,
                defaultValue:
                  "[\n  {\n    \"account\": 1,\n    \"description\": \"طرف مدين مصحح\",\n    \"debit\": \"100.00\",\n    \"credit\": \"0.00\"\n  },\n  {\n    \"account\": 2,\n    \"description\": \"طرف دائن مصحح\",\n    \"debit\": \"0.00\",\n    \"credit\": \"100.00\"\n  }\n]",
              },
            ],
          },
          payloadBuilder: async (_row, dialogPayload) => {
            const linesText = String(dialogPayload?.lines ?? "").trim();
            if (!linesText) {
              return null;
            }
            return {
              reason: dialogPayload?.reason,
              lines: JSON.parse(linesText),
            };
          },
        },
      ]}
      statusOptions={[
        { label: "الكل", value: "" },
        { label: "مسودة", value: "draft" },
        { label: "مرحل", value: "posted" },
        { label: "معكوس", value: "reversed" },
      ]}
      headerActions={
        <button type="button" className="btn btn-outline" onClick={handleExport} disabled={exporting}>
          {exporting ? "جارٍ التصدير..." : "تصدير إكسل"}
        </button>
      }
      toolbarActions={
        <>
          <button type="button" className="btn btn-outline" onClick={handleTemplateDownload} disabled={exporting}>
            تنزيل قالب إكسل
          </button>
          <input ref={fileInputRef} type="file" className="field-control" accept=".xlsx" />
          <button type="button" className="btn btn-primary" onClick={handleImport} disabled={importing}>
            {importing ? "جارٍ الاستيراد..." : "استيراد القيود"}
          </button>
          {importMessage ? <span className={importMessage.includes("تم") ? "status-chip" : "error-banner"}>{importMessage}</span> : null}
        </>
      }
    />
  );
}
