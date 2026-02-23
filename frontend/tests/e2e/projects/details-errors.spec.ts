import { expect, test } from "@playwright/test";

import { fulfillJson, mockBackendApi, paginated, setAuthCookie } from "../helpers/backend-mock";
import type { BackendMockHandler } from "../helpers/backend-mock";

function withBaseProjectMocks(): BackendMockHandler[] {
  return [
    async ({ method, path, route }) => {
      if (method !== "GET") {
        return false;
      }

      if (path === "/v1/projects/projects/70/") {
        await fulfillJson(route, {
          id: 70,
          code: "PRJ-070",
          name: "North Block",
          client_name: "Client North",
          description: "Main civil works package",
          status: "active",
          contract_value: "300000.00",
          budget: "250000.00",
          currency: "SAR",
          start_date: "2026-01-01",
          expected_end_date: "2026-09-30",
          closed_at: null,
          created_at: "2025-12-20T08:00:00Z",
          updated_at: "2026-02-20T09:00:00Z",
        });
        return true;
      }

      if (path === "/v1/projects/phases/") {
        await fulfillJson(
          route,
          paginated([
            {
              id: 1,
              project: 70,
              name: "Planning",
              sequence: 1,
              planned_progress: "100.00",
              actual_progress: "80.00",
              start_date: "2026-01-01",
              end_date: "2026-02-28",
            },
          ]),
        );
        return true;
      }

      return false;
    },
  ];
}

test.describe("Project details errors", () => {
  test("shows cost summary error on cost summary tab", async ({ page }) => {
    await setAuthCookie(page);

    await mockBackendApi(page, [
      ...withBaseProjectMocks(),
      async ({ method, path, route }) => {
        if (method !== "GET") {
          return false;
        }

        if (path === "/v1/projects/projects/70/cost-summary/") {
          await fulfillJson(route, { detail: "Cost summary is restricted for this role." }, 403);
          return true;
        }

        if (path === "/v1/projects/cost-records/") {
          await fulfillJson(route, paginated([]));
          return true;
        }

        if (path === "/v1/projects/change-orders/") {
          await fulfillJson(route, paginated([]));
          return true;
        }

        return false;
      },
    ]);

    await page.goto("/dashboard/projects/70");
    await expect(page.getByTestId("project-details-title")).toContainText("PRJ-070");

    await page.getByTestId("project-tab-cost_summary").click();
    await expect(page.getByText("Cost summary is restricted for this role.")).toBeVisible();
  });

  test("shows activity error when activity endpoint fails", async ({ page }) => {
    await setAuthCookie(page);

    await mockBackendApi(page, [
      ...withBaseProjectMocks(),
      async ({ method, path, route }) => {
        if (method !== "GET") {
          return false;
        }

        if (path === "/v1/projects/projects/70/cost-summary/") {
          await fulfillJson(route, {
            project_id: 70,
            project_code: "PRJ-070",
            totals: {
              budget: "250000.00",
              commitments: "100000.00",
              actual: "70000.00",
              available: "80000.00",
              variance: "5000.00",
            },
            lines: [],
          });
          return true;
        }

        if (path === "/v1/projects/cost-records/") {
          await fulfillJson(route, { detail: "You do not have permission to view activity records." }, 403);
          return true;
        }

        if (path === "/v1/projects/change-orders/") {
          await fulfillJson(route, paginated([]));
          return true;
        }

        return false;
      },
    ]);

    await page.goto("/dashboard/projects/70");
    await expect(page.getByTestId("project-details-title")).toContainText("PRJ-070");

    await page.getByTestId("project-tab-activity").click();
    await expect(page.getByText("You do not have permission to view activity records.")).toBeVisible();
  });
});
