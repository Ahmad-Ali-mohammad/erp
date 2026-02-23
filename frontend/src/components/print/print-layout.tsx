"use client";

import type { ReactNode } from "react";

import type { CompanyProfile, PrintSettings } from "@/lib/entities";

type PrintLayoutProps = {
  settings: PrintSettings;
  profile?: CompanyProfile | null;
  title?: string;
  subtitle?: string;
  meta?: ReactNode;
  children: ReactNode;
};

export function PrintLayout({ settings, profile, title, subtitle, meta, children }: PrintLayoutProps) {
  const opacity = Number(settings.watermark_opacity || "0.12");
  const rotation = Number(settings.watermark_rotation ?? -30);
  const scale = Number(settings.watermark_scale || "1");
  const primaryColor = profile?.primary_color || "var(--primary)";

  return (
    <div className="print-page">
      <div className="print-watermark" style={{ opacity, transform: `translate(-50%, -50%) rotate(${rotation}deg) scale(${scale})` }}>
        {settings.watermark_type === "image" && settings.watermark_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={settings.watermark_image_url} alt="Watermark" className="print-watermark-image" />
        ) : settings.watermark_type === "text" ? (
          <span className="print-watermark-text">{settings.watermark_text || "CONFIDENTIAL"}</span>
        ) : null}
      </div>

      <header className="print-header" style={{ borderColor: primaryColor }}>
        <div className="print-brand">
          {profile?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.logo_url} alt="Company logo" className="print-logo" />
          ) : null}
          <div className="print-brand-meta">
            {profile?.name ? <h2 className="print-company-name">{profile.name}</h2> : null}
            {profile?.legal_name ? <p className="print-company-legal">{profile.legal_name}</p> : null}
            <div className="print-company-contacts">
              {profile?.address ? <span>{profile.address}</span> : null}
              {profile?.phone ? <span>{profile.phone}</span> : null}
              {profile?.email ? <span>{profile.email}</span> : null}
              {profile?.tax_number ? <span>الرقم الضريبي: {profile.tax_number}</span> : null}
              {profile?.website ? <span>{profile.website}</span> : null}
            </div>
          </div>
        </div>
        <div className="print-document">
          {title ? <h2 className="print-title">{title}</h2> : null}
          {subtitle ? <p className="print-subtitle">{subtitle}</p> : null}
          {meta ? <div className="print-meta">{meta}</div> : null}
        </div>
      </header>

      <div className="print-content">{children}</div>
    </div>
  );
}
