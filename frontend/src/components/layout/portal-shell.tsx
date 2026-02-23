"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

import { LogoutButton } from "@/components/layout/logout-button";

const portalNav = [
  { href: "/portal", label: "الملخص" },
  { href: "/portal/contracts", label: "عقود البيع" },
  { href: "/portal/reservations", label: "الحجوزات" },
  { href: "/portal/installments", label: "الأقساط" },
  { href: "/portal/invoices", label: "الفواتير" },
  { href: "/portal/payments", label: "المدفوعات" },
  { href: "/portal/handovers", label: "التسليم" },
];

function isActive(pathname: string, href: string) {
  if (href === "/portal") {
    return pathname === href;
  }
  return pathname.startsWith(href);
}

export function PortalShell({
  children,
  username,
}: {
  children: React.ReactNode;
  username?: string | null;
}) {
  const pathname = usePathname();

  return (
    <div className="portal-shell">
      <header className="portal-header">
        <div>
          <p className="portal-eyebrow">بوابة العملاء</p>
          <h1 className="portal-title">مرحباً {username ?? "بك"}</h1>
        </div>
        <LogoutButton />
      </header>

      <nav className="portal-nav">
        {portalNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={clsx("portal-link", { "portal-link-active": isActive(pathname, item.href) })}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <main className="portal-content">{children}</main>
    </div>
  );
}
