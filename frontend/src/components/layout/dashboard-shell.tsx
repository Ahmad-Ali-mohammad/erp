import { LogoutButton } from "@/components/layout/logout-button";
import { SidebarNav } from "@/components/layout/sidebar-nav";

export function DashboardShell({
  children,
  username,
  roleSlug,
  rolePermissions,
}: {
  children: React.ReactNode;
  username?: string | null;
  roleSlug?: string | null;
  rolePermissions?: string[] | null;
}) {
  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="brand-block">
          <p className="brand-eyebrow">Construction ERP</p>
          <h1 className="brand-title">منصة المقاولات المالية</h1>
        </div>
        <SidebarNav roleSlug={roleSlug} permissions={rolePermissions ?? []} />
      </aside>

      <div className="app-main">
        <header className="app-header">
          <div>
            <p className="header-eyebrow">لوحة تشغيل متصلة بالباك إند</p>
            <h2 className="header-title">مرحباً {username ?? "بك"}</h2>
          </div>
          <LogoutButton />
        </header>
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
