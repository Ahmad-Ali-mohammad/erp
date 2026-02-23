import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ACCESS_TOKEN_COOKIE, API_BASE_URL, REFRESH_TOKEN_COOKIE } from "@/lib/config";
import {
  applyAuthCookies,
  clearAuthCookies,
  isTokenExpired,
  refreshAccessToken,
} from "@/lib/server/auth";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

const METHODS_WITH_BODY = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const PASSTHROUGH_HEADERS = ["content-type", "content-disposition"];

function buildBackendUrl(pathSegments: string[], sourceUrl: string): string {
  const originalUrl = new URL(sourceUrl);
  let path = pathSegments.join("/");
  if (!path.endsWith("/")) {
    path = `${path}/`;
  }
  return `${API_BASE_URL}/api/${path}${originalUrl.search}`;
}

async function proxyToBackend(request: Request, context: RouteContext) {
  const { path } = await context.params;
  const backendUrl = buildBackendUrl(path, request.url);
  const method = request.method.toUpperCase();

  const cookieStore = await cookies();
  let accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value ?? null;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value ?? null;
  let rotatedTokens: { access: string; refresh?: string } | null = null;

  if ((!accessToken || isTokenExpired(accessToken)) && refreshToken) {
    rotatedTokens = await refreshAccessToken(refreshToken);
    if (rotatedTokens?.access) {
      accessToken = rotatedTokens.access;
    }
  }

  if (!accessToken) {
    return NextResponse.json(
      { detail: "يجب تسجيل الدخول. سجّل الدخول من صفحة تسجيل الدخول ثم أعد المحاولة." },
      { status: 401 },
    );
  }

  const requestHeaders = new Headers();

  const incomingContentType = request.headers.get("content-type");
  if (incomingContentType) {
    requestHeaders.set("Content-Type", incomingContentType);
  }

  const rawBody = METHODS_WITH_BODY.has(method) ? await request.arrayBuffer() : null;

  const executeFetch = async (token: string) =>
    fetch(backendUrl, {
      method,
      headers: (() => {
        const outboundHeaders = new Headers(requestHeaders);
        outboundHeaders.set("Authorization", `Bearer ${token}`);
        return outboundHeaders;
      })(),
      body: rawBody && rawBody.byteLength > 0 ? rawBody : undefined,
      cache: "no-store",
      redirect: "follow",
    });

  let backendResponse = await executeFetch(accessToken);

  if (backendResponse.status === 401 && refreshToken) {
    const retryTokens = await refreshAccessToken(refreshToken);
    if (retryTokens?.access) {
      rotatedTokens = retryTokens;
      accessToken = retryTokens.access;
      backendResponse = await executeFetch(accessToken);
    }
  }

  const payload = await backendResponse.arrayBuffer();
  const response = new NextResponse(payload, { status: backendResponse.status });

  const contentType = backendResponse.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    response.headers.set("Content-Type", contentType.includes("charset=") ? contentType : "application/json; charset=utf-8");
  }
  for (const headerName of PASSTHROUGH_HEADERS) {
    if (headerName === "content-type") continue;
    const headerValue = backendResponse.headers.get(headerName);
    if (headerValue) {
      response.headers.set(headerName, headerValue);
    }
  }

  if (rotatedTokens?.access) {
    applyAuthCookies(response, rotatedTokens);
  }

  if (backendResponse.status === 401) {
    clearAuthCookies(response);
  }

  return response;
}

export async function GET(request: Request, context: RouteContext) {
  return proxyToBackend(request, context);
}

export async function POST(request: Request, context: RouteContext) {
  return proxyToBackend(request, context);
}

export async function PUT(request: Request, context: RouteContext) {
  return proxyToBackend(request, context);
}

export async function PATCH(request: Request, context: RouteContext) {
  return proxyToBackend(request, context);
}

export async function DELETE(request: Request, context: RouteContext) {
  return proxyToBackend(request, context);
}
