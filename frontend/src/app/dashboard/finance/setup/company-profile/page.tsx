"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { request } from "@/lib/api-client";
import type { CompanyProfile } from "@/lib/entities";

type CompanyProfileForm = {
  name: string;
  legal_name: string;
  logo_url: string;
  address: string;
  phone: string;
  email: string;
  tax_number: string;
  website: string;
  primary_color: string;
  secondary_color: string;
};

const defaultForm: CompanyProfileForm = {
  name: "",
  legal_name: "",
  logo_url: "",
  address: "",
  phone: "",
  email: "",
  tax_number: "",
  website: "",
  primary_color: "#0f2a43",
  secondary_color: "#c89b3c",
};

function profileToForm(profile: CompanyProfile): CompanyProfileForm {
  return {
    name: profile.name ?? "",
    legal_name: profile.legal_name ?? "",
    logo_url: profile.logo_url ?? "",
    address: profile.address ?? "",
    phone: profile.phone ?? "",
    email: profile.email ?? "",
    tax_number: profile.tax_number ?? "",
    website: profile.website ?? "",
    primary_color: profile.primary_color ?? "#0f2a43",
    secondary_color: profile.secondary_color ?? "#c89b3c",
  };
}

export default function CompanyProfilePage() {
  const [saveMessage, setSaveMessage] = useState("");

  const profileQuery = useQuery({
    queryKey: ["company-profile"],
    queryFn: () => request<CompanyProfile>("/v1/core/company-profile/"),
  });
  const errorMessage = profileQuery.error instanceof Error ? profileQuery.error.message : "";

  const saveMutation = useMutation({
    mutationFn: async (payload: CompanyProfileForm) =>
      request<CompanyProfile>("/v1/core/company-profile/", "PATCH", payload),
    onSuccess: (data) => {
      setSaveMessage("تم حفظ بيانات هوية الشركة.");
      setForm(profileToForm(data));
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "تعذر حفظ بيانات الشركة.";
      setSaveMessage(message);
    },
  });

  const [form, setForm] = useState<CompanyProfileForm>(defaultForm);

  useEffect(() => {
    if (profileQuery.data) {
      setForm(profileToForm(profileQuery.data));
    }
  }, [profileQuery.data]);

  return (
    <section className="resource-section">
      <header className="resource-header">
        <div>
          <h3>هوية الشركة</h3>
          <p>إدارة بيانات الهوية البصرية التي تظهر في جميع المطبوعات والفواتير.</p>
        </div>
      </header>

      {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}

      <div className="dialog-form" style={{ marginTop: "0.8rem" }}>
        <label className="dialog-field">
          <span>اسم الشركة</span>
          <input
            className="field-control"
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
          />
        </label>
        <label className="dialog-field">
          <span>الاسم القانوني</span>
          <input
            className="field-control"
            value={form.legal_name}
            onChange={(event) => setForm((prev) => ({ ...prev, legal_name: event.target.value }))}
          />
        </label>
        <label className="dialog-field">
          <span>رابط الشعار</span>
          <input
            className="field-control"
            value={form.logo_url}
            onChange={(event) => setForm((prev) => ({ ...prev, logo_url: event.target.value }))}
            placeholder="https://example.com/logo.png"
          />
        </label>
        <label className="dialog-field">
          <span>العنوان</span>
          <textarea
            className="field-control dialog-textarea"
            rows={3}
            value={form.address}
            onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
          />
        </label>
        <label className="dialog-field">
          <span>الهاتف</span>
          <input
            className="field-control"
            value={form.phone}
            onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
          />
        </label>
        <label className="dialog-field">
          <span>البريد الإلكتروني</span>
          <input
            className="field-control"
            type="email"
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
          />
        </label>
        <label className="dialog-field">
          <span>الرقم الضريبي</span>
          <input
            className="field-control"
            value={form.tax_number}
            onChange={(event) => setForm((prev) => ({ ...prev, tax_number: event.target.value }))}
          />
        </label>
        <label className="dialog-field">
          <span>الموقع الإلكتروني</span>
          <input
            className="field-control"
            value={form.website}
            onChange={(event) => setForm((prev) => ({ ...prev, website: event.target.value }))}
          />
        </label>
        <label className="dialog-field">
          <span>اللون الرئيسي</span>
          <input
            className="field-control"
            type="color"
            value={form.primary_color}
            onChange={(event) => setForm((prev) => ({ ...prev, primary_color: event.target.value }))}
          />
        </label>
        <label className="dialog-field">
          <span>اللون الثانوي</span>
          <input
            className="field-control"
            type="color"
            value={form.secondary_color}
            onChange={(event) => setForm((prev) => ({ ...prev, secondary_color: event.target.value }))}
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
          {saveMutation.isPending ? "جاري الحفظ..." : "حفظ بيانات الشركة"}
        </button>
        {saveMessage ? <span className={saveMessage.includes("تم") ? "status-chip" : "error-banner"}>{saveMessage}</span> : null}
      </div>
    </section>
  );
}
