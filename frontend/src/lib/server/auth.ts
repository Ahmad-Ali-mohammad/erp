import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ACCESS_TOKEN_COOKIE, API_BASE_URL, REFRESH_TOKEN_COOKIE } from "@/lib/config";

type JwtPayload = {
  exp?: number;
  iat?: number;
  user_id?: number;
  username?: string;
  role_id?: number | string;
  role_name?: string;
  role_slug?: string;
  role?: {
    id?: number | string;
    name?: string;
    slug?: string;
  } | string;
  permissions?: unknown;
  perms?: unknown;
  permission?: unknown;
  scope?: unknown;
  scopes?: unknown;
};

type SessionRole = {
  id: number | null;
  name: string | null;
  slug: string | null;
};

type TokenPair = {
  access: string;
  refresh?: string;
};

function decodeJwtPayload(token: string): JwtPayload | null {
  const segments = token.split(".");
  if (segments.length !== 3) {
    return null;
  }
  try {
    const payload = segments[1];
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const decoded = Buffer.from(padded, "base64").toString("utf-8");
    return JSON.parse(decoded) as JwtPayload;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string, skewSeconds = 20): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) {
    return true;
  }
  const now = Math.floor(Date.now() / 1000);
  return payload.exp <= now + skewSeconds;
}

function parseRoleId(rawValue: unknown): number | null {
  if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
    return rawValue;
  }
  if (typeof rawValue === "string") {
    const parsed = Number.parseInt(rawValue, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function parseRole(payload: JwtPayload | null): SessionRole | null {
  if (!payload) {
    return null;
  }

  const roleObject = typeof payload.role === "object" && payload.role !== null ? payload.role : null;
  const roleString = typeof payload.role === "string" ? payload.role : null;
  const slug =
    payload.role_slug ??
    roleObject?.slug ??
    (roleString ? roleString.trim().toLowerCase().replace(/\s+/g, "_") : null);
  const name = payload.role_name ?? roleObject?.name ?? (roleString ? roleString : null);
  const id = parseRoleId(payload.role_id ?? roleObject?.id);

  if (!slug && !name && id === null) {
    return null;
  }

  return {
    id,
    name: name ?? null,
    slug: slug ?? null,
  };
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
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (typeof rawValue === "string") {
    return rawValue
      .split(/[,\s]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function parsePermissions(payload: JwtPayload | null): string[] {
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

  return Array.from(new Set(merged.map((permission) => permission.toLowerCase())));
}

function getCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export function applyAuthCookies(response: NextResponse, tokens: TokenPair) {
  response.cookies.set(ACCESS_TOKEN_COOKIE, tokens.access, getCookieOptions(60 * 30));
  if (tokens.refresh) {
    response.cookies.set(REFRESH_TOKEN_COOKIE, tokens.refresh, getCookieOptions(60 * 60 * 24));
  }
}

export function clearAuthCookies(response: NextResponse) {
  response.cookies.set(ACCESS_TOKEN_COOKIE, "", { path: "/", maxAge: 0 });
  response.cookies.set(REFRESH_TOKEN_COOKIE, "", { path: "/", maxAge: 0 });
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenPair | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: refreshToken }),
      cache: "no-store",
    });
    if (!response.ok) {
      return null;
    }
    const tokens = (await response.json()) as TokenPair;
    if (!tokens.access) {
      return null;
    }
    if (!tokens.refresh) {
      tokens.refresh = refreshToken;
    }
    return tokens;
  } catch {
    return null;
  }
}

export async function getServerAccessToken(): Promise<{ token: string | null; rotated?: TokenPair | null }> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value ?? null;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value ?? null;

  if (accessToken && !isTokenExpired(accessToken)) {
    return { token: accessToken };
  }
  if (!refreshToken) {
    return { token: null };
  }

  const rotated = await refreshAccessToken(refreshToken);
  if (!rotated?.access) {
    return { token: null, rotated: null };
  }

  return { token: rotated.access, rotated };
}

export async function getSessionSnapshot() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value ?? null;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value ?? null;
  const payload = accessToken ? decodeJwtPayload(accessToken) : null;
  const role = parseRole(payload);
  const permissions = parsePermissions(payload);

  return {
    authenticated: Boolean(accessToken || refreshToken),
    userId: payload?.user_id ?? null,
    username: payload?.username ?? null,
    exp: payload?.exp ?? null,
    role,
    roleSlug: role?.slug ?? null,
    permissions,
  };
}
