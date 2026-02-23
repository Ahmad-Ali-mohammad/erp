import type { Page, Request, Route } from "@playwright/test";

export type PaginatedPayload<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type BackendMockContext = {
  route: Route;
  request: Request;
  method: string;
  path: string;
  url: URL;
};

export type BackendMockHandler = (context: BackendMockContext) => Promise<boolean> | boolean;

export function paginated<T>(results: T[]): PaginatedPayload<T> {
  return {
    count: results.length,
    next: null,
    previous: null,
    results,
  };
}

function base64Url(value: string): string {
  return Buffer.from(value).toString("base64url");
}

export function createTestJwt(payload: Record<string, unknown>): string {
  const header = { alg: "HS256", typ: "JWT" };
  return `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}.signature`;
}

export async function setAuthCookie(
  page: Page,
  options?: {
    accessToken?: string;
    includeRefreshToken?: boolean;
  },
) {
  const cookiesToSet = [
    {
      name: "erp_access_token",
      value:
        options?.accessToken ??
        createTestJwt({
          user_id: 1,
          username: "test-admin",
          role_slug: "admin",
          permissions: [],
        }),
      domain: "localhost",
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax" as const,
    },
  ];

  if (options?.includeRefreshToken) {
    cookiesToSet.push({
      name: "erp_refresh_token",
      value: "test-refresh-token",
      domain: "localhost",
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax" as const,
    });
  }

  await page.context().addCookies([
    ...cookiesToSet,
  ]);
}

export async function fulfillJson(route: Route, payload: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(payload),
  });
}

export async function mockBackendApi(page: Page, handlers: BackendMockHandler[]) {
  await page.route("**/api/backend/**", async (route) => {
    const request = route.request();
    const method = request.method();
    const url = new URL(request.url());
    const path = url.pathname.replace("/api/backend", "");
    const context: BackendMockContext = { route, request, method, path, url };

    for (const handler of handlers) {
      const handled = await handler(context);
      if (handled) {
        return;
      }
    }

    if (method === "GET") {
      await fulfillJson(route, paginated([]));
      return;
    }

    await fulfillJson(route, { detail: `Unmocked endpoint: ${method} ${path}` }, 404);
  });
}
