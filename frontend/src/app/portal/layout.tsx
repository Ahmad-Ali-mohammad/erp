import { redirect } from "next/navigation";

import { PortalShell } from "@/components/layout/portal-shell";
import { getSessionSnapshot } from "@/lib/server/auth";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionSnapshot();
  if (!session.authenticated) {
    redirect("/login?next=/portal");
  }

  return <PortalShell username={session.username}>{children}</PortalShell>;
}
