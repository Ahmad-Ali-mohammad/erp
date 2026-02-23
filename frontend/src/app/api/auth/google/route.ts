import { NextResponse } from "next/server";

import { API_BASE_URL } from "@/lib/config";
import { applyAuthCookies, clearAuthCookies } from "@/lib/server/auth";

type GooglePayload = {
  id_token?: string;
  credential?: string;
  user_type?: "customer" | "employee";
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as GooglePayload;
    const token = payload.id_token ?? payload.credential;
    if (!token) {
      return NextResponse.json({ detail: "Google credential is required." }, { status: 400 });
    }

    const backendResponse = await fetch(`${API_BASE_URL}/api/auth/google/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_token: token, user_type: payload.user_type ?? "employee" }),
      cache: "no-store",
    });

    const body = (await backendResponse.json().catch(() => ({}))) as Record<string, unknown>;
    if (!backendResponse.ok) {
      const failure = NextResponse.json(body, { status: backendResponse.status });
      clearAuthCookies(failure);
      return failure;
    }

    const access = typeof body.access === "string" ? body.access : "";
    const refresh = typeof body.refresh === "string" ? body.refresh : "";
    if (!access || !refresh) {
      const malformed = NextResponse.json({ detail: "Invalid token response from backend." }, { status: 502 });
      clearAuthCookies(malformed);
      return malformed;
    }

    const success = NextResponse.json({ ok: true });
    applyAuthCookies(success, { access, refresh });
    return success;
  } catch {
    return NextResponse.json({ detail: "Unable to authenticate with Google." }, { status: 500 });
  }
}
