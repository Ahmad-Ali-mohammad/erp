import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getSessionSnapshot } from "@/lib/server/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionSnapshot();
  return (
    <DashboardShell username={session.username} roleSlug={session.roleSlug} rolePermissions={session.permissions}>
      {children}
    </DashboardShell>
  );
}
