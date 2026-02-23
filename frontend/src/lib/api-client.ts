import { DEFAULT_PAGE_SIZE } from "@/lib/config";
import type { ApiErrorPayload, PaginatedResponse } from "@/lib/types";

export class ApiError extends Error {
  status: number;
  payload: ApiErrorPayload | null;

  constructor(message: string, status: number, payload: ApiErrorPayload | null = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type ListResourceParams = {
  page?: number;
  search?: string;
  ordering?: string;
  status?: string;
  pageSize?: number;
};

type ListAllResourceParams = Omit<ListResourceParams, "page"> & {
  maxPages?: number;
};

function buildQueryString(params?: Record<string, string | number | undefined>) {
  const searchParams = new URLSearchParams();
  if (!params) {
    return "";
  }
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    searchParams.set(key, String(value));
  }
  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

async function parseResponse<T>(response: Response): Promise<T> {
  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? ((await response.json()) as ApiErrorPayload) : null;

  if (!response.ok) {
    const message =
      (payload && (payload.detail as string)) ||
      (payload?.non_field_errors?.[0] as string) ||
      "Request failed";
    throw new ApiError(message, response.status, payload);
  }

  if (!isJson) {
    return {} as T;
  }
  return payload as T;
}

export async function request<T>(
  path: string,
  method: HttpMethod = "GET",
  body?: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(`/api/backend${path}`, {
    method,
    credentials: "same-origin",
    headers: body ? { "Content-Type": "application/json; charset=utf-8" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  return parseResponse<T>(response);
}

async function localRequest<T>(
  path: string,
  method: HttpMethod = "GET",
  body?: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  return parseResponse<T>(response);
}

export function listResource<T>(
  resourcePath: string,
  params?: ListResourceParams,
) {
  const query = buildQueryString({
    page: params?.page,
    search: params?.search,
    ordering: params?.ordering,
    status: params?.status,
    page_size: params?.pageSize ?? DEFAULT_PAGE_SIZE,
  });

  return request<PaginatedResponse<T>>(`${resourcePath}${query}`);
}

export async function listAllResource<T>(
  resourcePath: string,
  params?: ListAllResourceParams,
): Promise<T[]> {
  const pageSize = params?.pageSize ?? 200;
  const maxPages = params?.maxPages ?? 100;
  let page = 1;
  const rows: T[] = [];

  while (page <= maxPages) {
    const response = await listResource<T>(resourcePath, {
      page,
      search: params?.search,
      ordering: params?.ordering,
      status: params?.status,
      pageSize,
    });
    rows.push(...(response.results ?? []));

    if (!response.next || response.results.length === 0 || rows.length >= response.count) {
      break;
    }
    page += 1;
  }

  return rows;
}

export function workflowAction<T>(
  resourcePath: string,
  id: number | string,
  action: string,
  payload?: Record<string, unknown>,
) {
  return request<T>(`${resourcePath}${id}/${action}/`, "POST", payload);
}

export type SessionResponse = {
  authenticated: boolean;
  userId: number | null;
  username: string | null;
  exp: number | null;
  role: {
    id: number | null;
    name: string | null;
    slug: string | null;
  } | null;
  roleSlug: string | null;
  permissions: string[];
};

export function getSession() {
  return localRequest<SessionResponse>("/api/auth/session/");
}

export function login(username: string, password: string) {
  return localRequest<{ ok: boolean }>("/api/auth/login/", "POST", { username, password });
}

export function googleLogin(credential: string, userType: "customer" | "employee") {
  return localRequest<{ ok: boolean }>("/api/auth/google/", "POST", {
    credential,
    user_type: userType,
  });
}

export function logout() {
  return localRequest<{ ok: boolean }>("/api/auth/logout/", "POST");
}

export function createPaymentIntent(payload: {
  invoice?: number;
  installment?: number;
  amount?: string;
  currency?: string;
}) {
  return request<{
    id: number;
    client_secret: string;
    amount: string;
    currency: string;
  }>("/v1/payments/payment-intents/", "POST", payload as Record<string, unknown>);
}

export function getPaymentIntent(id: number | string) {
  return request<{
    id: number;
    client_secret: string;
    amount: string;
    currency: string;
    status: string;
  }>(`/v1/payments/payment-intents/${id}/`);
}
