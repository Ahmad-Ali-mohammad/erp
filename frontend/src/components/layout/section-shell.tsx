"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";

type SectionTab = {
  href: string;
  label: string;
};

type SectionTabAction = {
  label: string;
  href: string;
  variant?: "primary" | "outline";
};

type SectionTabMeta = {
  tier?: "primary" | "secondary";
  badge?: string;
};

type SectionShellProps = {
  title: string;
  description?: string;
  tabs: SectionTab[];
  tabActions?: SectionTabAction[];
  tabMeta?: Record<string, SectionTabMeta>;
  children: React.ReactNode;
};

export function SectionShell({ title, description, tabs, tabActions, tabMeta, children }: SectionShellProps) {
  const pathname = usePathname();
  const activeTab =
    tabs
      .filter((tab) => pathname === tab.href || pathname.startsWith(`${tab.href}/`))
      .sort((a, b) => b.href.length - a.href.length)[0] ?? null;

  return (
    <div className="section-shell">
      <header className="section-header">
        <div>
          <h3>{title}</h3>
          {description ? <p>{description}</p> : null}
        </div>
      </header>

      <div className="section-tabs-wrap">
        <div className="section-tabs">
          {tabs.map((tab) => {
            const meta = tabMeta?.[tab.href];
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={clsx("section-tab", {
                  "section-tab-active": activeTab?.href === tab.href,
                  "section-tab-secondary": meta?.tier === "secondary",
                })}
              >
                <span>{tab.label}</span>
                {meta?.badge ? <small className="section-tab-badge">{meta.badge}</small> : null}
              </Link>
            );
          })}
        </div>
        {tabActions?.length ? (
          <div className="section-tab-actions">
            {tabActions.map((action) => (
              <Link
                key={`${action.href}-${action.label}`}
                href={action.href}
                className={clsx("btn", action.variant === "primary" ? "btn-primary" : "btn-outline")}
              >
                {action.label}
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      <div className="section-body">{children}</div>
    </div>
  );
}
