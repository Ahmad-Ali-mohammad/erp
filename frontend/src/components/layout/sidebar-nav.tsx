"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { hasAreaAccess, type AccessArea } from "@/lib/access-control";

type NavItem = {
  label: string;
  href: string;
};

type NavGroup = {
  key: string;
  title: string;
  area?: AccessArea;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    key: "overview",
    title: "الملخص",
    items: [
      { label: "لوحة التحكم", href: "/dashboard" },
      { label: "صلاحياتي", href: "/dashboard/access" },
    ],
  },
  {
    key: "projects",
    title: "المشاريع",
    area: "projects",
    items: [{ label: "المشاريع", href: "/dashboard/projects" }],
  },
  {
    key: "procurement",
    title: "المشتريات",
    area: "procurement",
    items: [{ label: "المشتريات", href: "/dashboard/procurement" }],
  },
  {
    key: "finance",
    title: "المالية",
    area: "finance",
    items: [
      { label: "المالية", href: "/dashboard/finance" },
      { label: "المحاسبة v2", href: "/dashboard/accounting-v2" },
    ],
  },
  {
    key: "real-estate",
    title: "العقارات",
    area: "real_estate",
    items: [{ label: "العقارات", href: "/dashboard/real-estate" }],
  },
  {
    key: "admin",
    title: "الإدارة",
    area: "admin",
    items: [{ label: "الإدارة", href: "/dashboard/admin" }],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === href;
  }
  return pathname.startsWith(href);
}

function toNavTestId(href: string): string {
  return `nav-link-${href.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase()}`;
}

export function SidebarNav({
  roleSlug,
  permissions,
}: {
  roleSlug?: string | null;
  permissions?: string[] | null;
}) {
  const pathname = usePathname();
  const visibleGroups = navGroups.filter((group) => !group.area || hasAreaAccess(roleSlug, group.area, permissions));

  return (
    <nav className="sidebar-nav">
      {visibleGroups.map((group) => (
        <section key={group.key} className="sidebar-group" data-testid={`nav-group-${group.key}`}>
          <p className="sidebar-group-title">{group.title}</p>
          <ul className="sidebar-links">
            {group.items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  data-testid={toNavTestId(item.href)}
                  className={clsx("sidebar-link", { "sidebar-link-active": isActive(pathname, item.href) })}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </nav>
  );
}
