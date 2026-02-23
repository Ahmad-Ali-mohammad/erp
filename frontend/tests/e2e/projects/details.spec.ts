import { expect, test } from "@playwright/test";

import { fulfillJson, mockBackendApi, paginated, setAuthCookie } from "../helpers/backend-mock";

const currencyFormatter = new Intl.NumberFormat("ar-SA", {
  style: "currency",
  currency: "SAR",
  maximumFractionDigits: 2,
});

test.describe("Project details", () => {
  test("renders overview, cost summary, and activity tabs", async ({ page }) => {
    await setAuthCookie(page);

    await mockBackendApi(page, [
      async ({ method, path, route }) => {
        if (method !== "GET") {
          return false;
        }

        if (path === "/v1/projects/projects/30/") {
          await fulfillJson(route, {
            id: 30,
            code: "PRJ-030",
            name: "West Block",
            client_name: "Client West",
            description: "Mixed-use development package",
            status: "active",
            contract_value: "750000.00",
            budget: "620000.00",
            currency: "SAR",
            start_date: "2026-01-10",
            expected_end_date: "2026-12-20",
            closed_at: null,
            created_at: "2026-01-01T08:00:00Z",
            updated_at: "2026-02-20T10:00:00Z",
          });
          return true;
        }

        if (path === "/v1/projects/projects/30/cost-summary/") {
          await fulfillJson(route, {
            project_id: 30,
            project_code: "PRJ-030",
            totals: {
              budget: "620000.00",
              commitments: "180000.00",
              actual: "140000.00",
              available: "300000.00",
              variance: "-20000.00",
            },
            lines: [
              {
                cost_code_id: 100,
                cost_code: "CC-100",
                cost_code_name: "Concrete Works",
                budget: "200000.00",
                commitments: "60000.00",
                actual: "50000.00",
                available: "90000.00",
                variance: "-10000.00",
              },
            ],
          });
          return true;
        }

        if (path === "/v1/projects/phases/") {
          await fulfillJson(
            route,
            paginated([
              {
                id: 401,
                project: 30,
                name: "Foundation",
                sequence: 1,
                planned_progress: "100.00",
                actual_progress: "40.00",
                start_date: "2026-01-10",
                end_date: "2026-03-15",
              },
            ]),
          );
          return true;
        }

        if (path === "/v1/projects/cost-records/") {
          await fulfillJson(
            route,
            paginated([
              {
                id: 501,
                project: 30,
                cost_code: 100,
                record_type: "material",
                amount: "12000.00",
                source_module: "procurement",
                source_reference: "PO-310",
                record_date: "2026-02-15",
              },
            ]),
          );
          return true;
        }

        if (path === "/v1/projects/change-orders/") {
          await fulfillJson(
            route,
            paginated([
              {
                id: 601,
                project: 30,
                order_number: "CO-30",
                title: "Additional retaining wall",
                total_contract_value_delta: "22000.00",
                total_budget_delta: "18000.00",
                status: "approved",
                created_at: "2026-02-10T09:00:00Z",
              },
            ]),
          );
          return true;
        }

        return false;
      },
    ]);

    await page.goto("/dashboard/projects/30");

    await expect(page.getByTestId("project-details-title")).toContainText("PRJ-030");
    await expect(page.getByTestId("project-kpi-contract-value")).toHaveText(currencyFormatter.format(750000));
    await expect(page.getByTestId("project-kpi-budget-value")).toHaveText(currencyFormatter.format(620000));
    await expect(page.getByText("Foundation")).toBeVisible();

    await page.getByTestId("project-tab-cost_summary").click();
    await expect(page.getByTestId("project-cost-summary-budget")).toHaveText(currencyFormatter.format(620000));
    await expect(page.getByTestId("project-cost-summary-actual")).toHaveText(currencyFormatter.format(140000));
    await expect(page.getByText("CC-100")).toBeVisible();

    await page.getByTestId("project-tab-activity").click();
    await expect(page.getByText("material")).toBeVisible();
    await expect(page.getByText("CO-30")).toBeVisible();
  });
});
