import { NextResponse } from "next/server";

import { getSessionSnapshot } from "@/lib/server/auth";

export async function GET() {
  const snapshot = await getSessionSnapshot();
  return NextResponse.json(snapshot);
}
