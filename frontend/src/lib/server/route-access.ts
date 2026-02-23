import { redirect } from "next/navigation";

import { hasAreaAccess, type AccessArea } from "@/lib/access-control";
import { getSessionSnapshot } from "@/lib/server/auth";

export async function enforceAreaAccess(area: AccessArea) {
  const session = await getSessionSnapshot();
  const allowed = hasAreaAccess(session.roleSlug, area, session.permissions);
  if (!allowed) {
    redirect(`/dashboard/access?denied=${area}`);
  }
}
