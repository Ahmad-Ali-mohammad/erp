import { NextResponse, type NextRequest } from "next/server";

import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/config";
import { hasAreaAccess, type AccessArea } from "@/lib/access-control";

const AUTH_PAGES = new Set(["/login"]);

type MiddlewareJwtPayload = {
  role_slug?: string;
  role_name?: string;
  role?: {
    slug?: string;
    name?: string;
  } | string;
  permissions?: unknown;
  perms?: unknown;
  permission?: unknown;
  scope?: unknown;
  scopes?: unknown;
};

function decodeJwtPayload(token: string): MiddlewareJwtPayload | null {
  const segments = token.split(".");
  if (segments.length !== 3) {
    return null;
  }
  try {
    const payload = segments[1];
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    let decoded = "";
    if (typeof atob === "function") {
      decoded = atob(padded);
    } else if (typeof Buffer !== "undefined") {
      decoded = Buffer.from(padded, "base64").toString("utf-8");
    } else {
      return null;
    }
    return JSON.parse(decoded) as MiddlewareJwtPayload;
  } catch {
    return null;
  }
}

function parsePermissionSource(rawValue: unknown): string[] {
  if (Array.isArray(rawValue)) {
    return rawValue
      .flatMap((item) => {
        if (typeof item === "string") {
          return item;
        }
        if (typeof item === "object" && item !== null) {
          const candidate =
            (item as Record<string, unknown>).codename ??
            (item as Record<string, unknown>).code ??
            (item as Record<string, unknown>).name ??
            (item as Record<string, unknown>).slug;
          return typeof candidate === "string" ? candidate : [];
        }
        return [];
      })
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
  }

  if (typeof rawValue === "string") {
    return rawValue
      .split(/[,\s]+/)
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
  }

  return [];
}

function parsePermissions(payload: MiddlewareJwtPayload | null): string[] {
  if (!payload) {
    return [];
  }
  const merged = [
    ...parsePermissionSource(payload.permissions),
    ...parsePermissionSource(payload.perms),
    ...parsePermissionSource(payload.permission),
    ...parsePermissionSource(payload.scope),
    ...parsePermissionSource(payload.scopes),
  ];
  return Array.from(new Set(merged));
}

function resolveRoleSlug(payload: MiddlewareJwtPayload | null): string | null {
  if (!payload) {
    return null;
  }
  if (typeof payload.role_slug === "string" && payload.role_slug.trim()) {
    return payload.role_slug.trim().toLowerCase().replace(/\s+/g, "_");
  }
  if (typeof payload.role === "string" && payload.role.trim()) {
    return payload.role.trim().toLowerCase().replace(/\s+/g, "_");
  }
  if (typeof payload.role === "object" && payload.role !== null && typeof payload.role.slug === "string") {
    return payload.role.slug.trim().toLowerCase().replace(/\s+/g, "_");
  }
  return null;
}

function resolveDashboardArea(pathname: string): AccessArea | null {
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/access")) {
    return null;
  }
  if (pathname.startsWith("/dashboard/projects")) {
    return "projects";
  }
  if (pathname.startsWith("/dashboard/procurement")) {
    return "procurement";
  }
  if (pathname.startsWith("/dashboard/finance")) {
    return "finance";
  }
  if (pathname.startsWith("/dashboard/admin")) {
    return "admin";
  }
  return null;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  const isAuthenticated = Boolean(accessToken || refreshToken);

  if ((pathname.startsWith("/dashboard") || pathname.startsWith("/portal")) && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (AUTH_PAGES.has(pathname) && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (pathname.startsWith("/dashboard") && accessToken) {
    const area = resolveDashboardArea(pathname);
    if (area) {
      const payload = decodeJwtPayload(accessToken);
      const roleSlug = resolveRoleSlug(payload);
      const permissions = parsePermissions(payload);
      const canViewArea = hasAreaAccess(roleSlug, area, permissions);
      if (!canViewArea) {
        const deniedUrl = new URL("/dashboard/access", request.url);
        deniedUrl.searchParams.set("denied", area);
        return NextResponse.redirect(deniedUrl);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/portal/:path*", "/login"],
};
