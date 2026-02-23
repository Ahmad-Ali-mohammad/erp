"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { request } from "@/lib/api-client";
import type { PrintSettings } from "@/lib/entities";

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

export default function PrintSettingsSetupPage() {
  const queryClient = useQueryClient();
  const [saveMessage, setSaveMessage] = useState("");
  const [draft, setDraft] = useState<Partial<PrintSettingsForm>>({});

  const settingsQuery = useQuery({
    queryKey: ["print-settings"],
    queryFn: () => request<PrintSettings>("/v1/finance/print-settings/"),
  });

  const errorMessage = settingsQuery.error instanceof Error ? settingsQuery.error.message : "";
  const baseForm = settingsQuery.data ? settingsToForm(settingsQuery.data) : defaultForm;
  const form: PrintSettingsForm = { ...baseForm, ...draft };

  const saveMutation = useMutation({
    mutationFn: async (payload: PrintSettingsForm) =>
      request<PrintSettings>("/v1/finance/print-settings/", "PATCH", payload),
    onSuccess: (data) => {
      setSaveMessage("Print settings saved.");
      setDraft({});
      queryClient.setQueryData(["print-settings"], data);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Failed to save print settings.";
      setSaveMessage(message);
    },
  });

  return (
    <section className="resource-section">
      <header className="resource-header">
        <div>
          <h3>Print and Watermark Settings</h3>
          <p>Manage watermark behavior and invoice numbering defaults.</p>
        </div>
      </header>

      {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}

      <div className="dialog-form" style={{ marginTop: "0.8rem" }}>
        <label className="dialog-field">
          <span>Watermark Type</span>
          <select
            className="field-control"
            value={form.watermark_type}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, watermark_type: event.target.value as PrintSettingsForm["watermark_type"] }))
            }
          >
            <option value="none">None</option>
            <option value="text">Text</option>
            <option value="image">Image</option>
          </select>
        </label>

        <label className="dialog-field">
          <span>Watermark Text</span>
          <input
            className="field-control"
            value={form.watermark_text}
            onChange={(event) => setDraft((prev) => ({ ...prev, watermark_text: event.target.value }))}
            placeholder="Original Copy"
          />
        </label>

        <label className="dialog-field">
          <span>Watermark Image URL</span>
          <input
            className="field-control"
            value={form.watermark_image_url}
            onChange={(event) => setDraft((prev) => ({ ...prev, watermark_image_url: event.target.value }))}
            placeholder="https://example.com/watermark.png"
          />
        </label>

        <label className="dialog-field">
          <span>Opacity (0 to 1)</span>
          <input
            className="field-control"
            type="number"
            step="0.01"
            value={form.watermark_opacity}
            onChange={(event) => setDraft((prev) => ({ ...prev, watermark_opacity: event.target.value }))}
          />
        </label>

        <label className="dialog-field">
          <span>Rotation (degrees)</span>
          <input
            className="field-control"
            type="number"
            value={form.watermark_rotation}
            onChange={(event) => setDraft((prev) => ({ ...prev, watermark_rotation: event.target.value }))}
          />
        </label>

        <label className="dialog-field">
          <span>Scale</span>
          <input
            className="field-control"
            type="number"
            step="0.1"
            value={form.watermark_scale}
            onChange={(event) => setDraft((prev) => ({ ...prev, watermark_scale: event.target.value }))}
          />
        </label>

        <label className="dialog-field">
          <span>Invoice Prefix</span>
          <input
            className="field-control"
            value={form.invoice_prefix}
            onChange={(event) => setDraft((prev) => ({ ...prev, invoice_prefix: event.target.value }))}
          />
        </label>

        <label className="dialog-field">
          <span>Invoice Padding</span>
          <input
            className="field-control"
            type="number"
            value={form.invoice_padding}
            onChange={(event) => setDraft((prev) => ({ ...prev, invoice_padding: event.target.value }))}
          />
        </label>

        <label className="dialog-field">
          <span>Next Invoice Number</span>
          <input
            className="field-control"
            type="number"
            value={form.invoice_next_number}
            onChange={(event) => setDraft((prev) => ({ ...prev, invoice_next_number: event.target.value }))}
          />
        </label>
      </div>

      <div className="hero-actions" style={{ marginTop: "0.8rem" }}>
        <button
          type="button"
          className="btn btn-primary"
          disabled={saveMutation.isPending}
          onClick={() => {
            setSaveMessage("");
            saveMutation.mutate(form);
          }}
        >
          {saveMutation.isPending ? "Saving..." : "Save Settings"}
        </button>
        {saveMessage ? <span className={saveMessage.includes("saved") ? "status-chip" : "error-banner"}>{saveMessage}</span> : null}
      </div>
    </section>
  );
}
