"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";

import { listResource, request } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import type { Invoice, PrintSettings } from "@/lib/entities";

type PrintSettingsForm = {
  watermark_type: "none" | "text" | "image";
  watermark_text: string;
  watermark_image_url: string;
  watermark_opacity: string;
  watermark_rotation: string;
  watermark_scale: string;
  invoice_prefix: string;
  invoice_padding: string;
  invoice_next_number: string;
};

const defaultForm: PrintSettingsForm = {
  watermark_type: "text",
  watermark_text: "",
  watermark_image_url: "",
  watermark_opacity: "0.12",
  watermark_rotation: "-30",
  watermark_scale: "1.00",
  invoice_prefix: "INV-",
  invoice_padding: "5",
  invoice_next_number: "1",
};

function settingsToForm(settings: PrintSettings): PrintSettingsForm {
  return {
    watermark_type: settings.watermark_type,
    watermark_text: settings.watermark_text ?? "",
    watermark_image_url: settings.watermark_image_url ?? "",
    watermark_opacity: String(settings.watermark_opacity ?? "0.12"),
    watermark_rotation: String(settings.watermark_rotation ?? -30),
    watermark_scale: String(settings.watermark_scale ?? "1.00"),
    invoice_prefix: settings.invoice_prefix ?? "INV-",
    invoice_padding: String(settings.invoice_padding ?? 5),
    invoice_next_number: String(settings.invoice_next_number ?? 1),
  };
}

type PrintSettingsEditorProps = {
  initialForm: PrintSettingsForm;
  onSave: (payload: PrintSettingsForm) => void;
  isSaving: boolean;
  saveMessage: string;
  setSaveMessage: (value: string) => void;
};

function PrintSettingsEditor({ initialForm, onSave, isSaving, saveMessage, setSaveMessage }: PrintSettingsEditorProps) {
  const [form, setForm] = useState<PrintSettingsForm>(initialForm);

  return (
    <>
      <div className="dialog-form" style={{ marginTop: "0.8rem" }}>
        <label className="dialog-field">
          <span>نوع العلامة المائية</span>
          <select
            className="field-control"
            value={form.watermark_type}
            onChange={(event) => setForm((prev) => ({ ...prev, watermark_type: event.target.value as PrintSettingsForm["watermark_type"] }))}
          >
            <option value="none">بدون علامة</option>
            <option value="text">نص</option>
            <option value="image">صورة</option>
          </select>
        </label>
        <label className="dialog-field">
          <span>نص العلامة المائية</span>
          <input
            className="field-control"
            value={form.watermark_text}
            onChange={(event) => setForm((prev) => ({ ...prev, watermark_text: event.target.value }))}
            placeholder="مثال: نسخة أصلية"
          />
        </label>
        <label className="dialog-field">
          <span>رابط صورة العلامة المائية</span>
          <input
            className="field-control"
            value={form.watermark_image_url}
            onChange={(event) => setForm((prev) => ({ ...prev, watermark_image_url: event.target.value }))}
            placeholder="https://example.com/watermark.png"
          />
        </label>
        <label className="dialog-field">
          <span>الشفافية (0 إلى 1)</span>
          <input
            className="field-control"
            type="number"
            step="0.01"
            value={form.watermark_opacity}
            onChange={(event) => setForm((prev) => ({ ...prev, watermark_opacity: event.target.value }))}
          />
        </label>
        <label className="dialog-field">
          <span>زاوية الميل</span>
          <input
            className="field-control"
            type="number"
            value={form.watermark_rotation}
            onChange={(event) => setForm((prev) => ({ ...prev, watermark_rotation: event.target.value }))}
          />
        </label>
        <label className="dialog-field">
          <span>مقياس العلامة</span>
          <input
            className="field-control"
            type="number"
            step="0.1"
            value={form.watermark_scale}
            onChange={(event) => setForm((prev) => ({ ...prev, watermark_scale: event.target.value }))}
          />
        </label>
        <label className="dialog-field">
          <span>بادئة رقم الفاتورة</span>
          <input
            className="field-control"
            value={form.invoice_prefix}
            onChange={(event) => setForm((prev) => ({ ...prev, invoice_prefix: event.target.value }))}
          />
        </label>
        <label className="dialog-field">
          <span>عدد خانات الترقيم</span>
          <input
            className="field-control"
            type="number"
            value={form.invoice_padding}
            onChange={(event) => setForm((prev) => ({ ...prev, invoice_padding: event.target.value }))}
          />
        </label>
        <label className="dialog-field">
          <span>الرقم التالي</span>
          <input
            className="field-control"
            type="number"
            value={form.invoice_next_number}
            onChange={(event) => setForm((prev) => ({ ...prev, invoice_next_number: event.target.value }))}
          />
        </label>
      </div>

      <div className="hero-actions" style={{ marginTop: "0.8rem" }}>
        <button
          type="button"
          className="btn btn-primary"
          disabled={isSaving}
          onClick={() => {
            setSaveMessage("");
            onSave(form);
          }}
        >
          {isSaving ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
        </button>
        {saveMessage ? <span className={saveMessage.includes("تم") ? "status-chip" : "error-banner"}>{saveMessage}</span> : null}
      </div>
    </>
  );
}

export default function PrintoutsPage() {
  const [saveMessage, setSaveMessage] = useState("");

  const settingsQuery = useQuery({
    queryKey: ["print-settings"],
    queryFn: () => request<PrintSettings>("/v1/finance/print-settings/"),
  });

  const invoicesQuery = useQuery({
    queryKey: ["printout-invoices"],
    queryFn: () => listResource<Invoice>("/v1/finance/invoices/", { ordering: "-issue_date", pageSize: 20 }),
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: Partial<PrintSettingsForm>) => request<PrintSettings>("/v1/finance/print-settings/", "PATCH", payload),
    onSuccess: () => setSaveMessage("تم حفظ إعدادات المطبوعات."),
    onError: (error) => setSaveMessage(error instanceof Error ? error.message : "تعذر حفظ الإعدادات."),
  });

  const invoices = invoicesQuery.data?.results ?? [];
  const invoiceCountLabel = useMemo(
    () => (invoicesQuery.data ? `${invoicesQuery.data.count} فاتورة` : ""),
    [invoicesQuery.data],
  );

  const settingsForm = settingsQuery.data ? settingsToForm(settingsQuery.data) : defaultForm;
  const settingsKey = settingsQuery.data?.updated_at ?? "default";

  return (
    <section className="resource-section">
      <header className="resource-header">
        <div>
          <h3>المطبوعات والإخراج</h3>
          <p>هذه الشاشة تقع ضمن تبويب التقارير، وتُستخدم لضبط الطباعة واستخراج نسخ الفواتير.</p>
        </div>
      </header>

      <div className="hero-actions" style={{ marginTop: "0.8rem" }}>
        <Link className="btn btn-outline" href="/dashboard/finance/reports">
          الرجوع إلى التقارير
        </Link>
        <Link className="btn btn-outline" href="/dashboard/finance/guides/reports">
          تعليمات الاستخدام
        </Link>
      </div>

      <section className="resource-section" style={{ marginTop: "0.8rem" }}>
        <header className="resource-header">
          <div>
            <h4 style={{ margin: 0 }}>أولوية 1: إعدادات الطباعة</h4>
            <p style={{ marginTop: "0.35rem", color: "var(--text-soft)" }}>اضبط العلامة المائية وتسلسل أرقام الفواتير قبل الطباعة.</p>
          </div>
        </header>

        <PrintSettingsEditor
          key={settingsKey}
          initialForm={settingsForm}
          onSave={(payload) => saveMutation.mutate(payload)}
          isSaving={saveMutation.isPending}
          saveMessage={saveMessage}
          setSaveMessage={setSaveMessage}
        />
      </section>

      <section className="resource-section" style={{ marginTop: "0.8rem" }}>
        <header className="resource-header">
          <div>
            <h4 style={{ margin: 0 }}>أولوية 2: طباعة الفواتير</h4>
            <p style={{ marginTop: "0.35rem", color: "var(--text-soft)" }}>
              اختر الفاتورة المطلوبة للطباعة. {invoiceCountLabel}
            </p>
          </div>
        </header>

        <div className="table-scroll">
          <table className="resource-table">
            <thead>
              <tr>
                <th>رقم الفاتورة</th>
                <th>العميل/المورد</th>
                <th>تاريخ الإصدار</th>
                <th>الحالة</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {invoicesQuery.isLoading ? (
                <tr>
                  <td colSpan={5} className="table-empty">
                    جاري تحميل الفواتير...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="table-empty">
                    لا توجد فواتير متاحة.
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>{invoice.invoice_number}</td>
                    <td>{invoice.partner_name}</td>
                    <td>{formatDate(invoice.issue_date)}</td>
                    <td>{invoice.status}</td>
                    <td>
                      <Link className="btn btn-outline" href={`/dashboard/finance/printouts/invoices/${invoice.id}`} target="_blank">
                        طباعة
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
