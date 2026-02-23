import { NextResponse } from "next/server";

import { API_BASE_URL } from "@/lib/config";
import { applyAuthCookies, clearAuthCookies } from "@/lib/server/auth";

type LoginPayload = {
  username?: string;
  password?: string;
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as LoginPayload;
    if (!payload.username || !payload.password) {
      return NextResponse.json(
        { detail: "Username and password are required." },
        { status: 400 },
      );
    }

    const backendResponse = await fetch(`${API_BASE_URL}/api/auth/token/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const body = (await backendResponse.json().catch(() => ({}))) as Record<string, unknown>;
    if (!backendResponse.ok) {
      const failureResponse = NextResponse.json(body, { status: backendResponse.status });
      clearAuthCookies(failureResponse);
      return failureResponse;
    }

    const access = typeof body.access === "string" ? body.access : "";
    const refresh = typeof body.refresh === "string" ? body.refresh : "";
    if (!access || !refresh) {
      const malformedResponse = NextResponse.json(
        { detail: "Invalid token response from backend." },
        { status: 502 },
      );
      clearAuthCookies(malformedResponse);
      return malformedResponse;
    }

    const successResponse = NextResponse.json({ ok: true });
    applyAuthCookies(successResponse, { access, refresh });
    return successResponse;
  } catch {
    return NextResponse.json({ detail: "Unable to login right now." }, { status: 500 });
  }
}
