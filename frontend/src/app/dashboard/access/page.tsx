"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

import type { AccessArea } from "@/lib/access-control";
import { useAccessControl } from "@/lib/use-access-control";

const accessAreas: Array<{ key: AccessArea; label: string }> = [
  { key: "projects", label: "Projects" },
  { key: "procurement", label: "Procurement" },
  { key: "finance", label: "Finance" },
  { key: "real_estate", label: "Real Estate" },
  { key: "admin", label: "Admin" },
];

export default function AccessPage() {
  const access = useAccessControl();
  const searchParams = useSearchParams();
  const deniedArea = searchParams.get("denied");
  const permissions = access.permissions ?? [];

  const accessMatrix = useMemo(
    () =>
      accessAreas.map((area) => ({
        area,
        view: access.canViewArea(area.key),
        manage: access.canManageArea(area.key),
        approve: access.canApproveArea(area.key),
      })),
    [access],
  );

  return (
    <section className="resource-section">
      <header className="resource-header">
        <div>
          <h3>صلاحياتي</h3>
          <p>عرض الدور الحالي والـpermission claims كما تم تفسيرها في الواجهة.</p>
        </div>
      </header>

      {deniedArea ? (
        <p className="error-banner" data-testid="access-denied-banner">
          Access to `{deniedArea}` module is not allowed for your current permissions.
        </p>
      ) : null}

      <div className="project-overview-grid">
        <article className="panel">
          <h4 className="project-panel-title">Session Role</h4>
          <p data-testid="access-role-slug">{access.roleSlug ?? "-"}</p>
          <p data-testid="access-username">{access.session?.username ?? "-"}</p>
        </article>

        <article className="panel">
          <h4 className="project-panel-title">Permission Claims</h4>
          {permissions.length === 0 ? (
            <p data-testid="access-permissions-empty">No explicit claims in token.</p>
          ) : (
            <ul className="simple-list" data-testid="access-permissions-list">
              {permissions.map((permission) => (
                <li key={permission} data-testid={`access-permission-${permission.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`}>
                  {permission}
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>

      <article className="panel">
        <h4 className="project-panel-title">Computed Access Matrix</h4>
        <div className="table-scroll">
          <table className="resource-table">
            <thead>
              <tr>
                <th>Area</th>
                <th>View</th>
                <th>Manage</th>
                <th>Approve</th>
              </tr>
            </thead>
            <tbody>
              {accessMatrix.map((row) => (
                <tr key={row.area.key}>
                  <td>{row.area.label}</td>
                  <td data-testid={`access-matrix-${row.area.key}-view`}>{row.view ? "Yes" : "No"}</td>
                  <td data-testid={`access-matrix-${row.area.key}-manage`}>{row.manage ? "Yes" : "No"}</td>
                  <td data-testid={`access-matrix-${row.area.key}-approve`}>{row.approve ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
