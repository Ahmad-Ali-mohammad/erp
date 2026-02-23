const rawApiBaseUrl =
  process.env.INTERNAL_API_BASE_URL ??
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8000";

export const API_BASE_URL = rawApiBaseUrl.replace(/\/+$/, "");
export const API_V2_BASE_URL = `${API_BASE_URL}/api/v2`.replace(/\/+$/, "");

export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
export const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";

export const ACCESS_TOKEN_COOKIE = "erp_access_token";
export const REFRESH_TOKEN_COOKIE = "erp_refresh_token";

export const DEFAULT_PAGE_SIZE = 20;
