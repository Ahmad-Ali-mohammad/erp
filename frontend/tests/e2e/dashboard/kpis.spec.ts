import { expect, test } from "@playwright/test";

import { fulfillJson, mockBackendApi, setAuthCookie } from "../helpers/backend-mock";

const currencyFormatter = new Intl.NumberFormat("ar-SA", {
  style: "currency",
  currency: "SAR",
  maximumFractionDigits: 2,
});

test.describe("Dashboard KPIs", () => {
  test("shows aggregated counts and totals from backend data", async ({ page }) => {
    await setAuthCookie(page);

    await mockBackendApi(page, [
      async ({ method, path, route }) => {
        if (method !== "GET") {
          return false;
        }

        if (path === "/v1/projects/projects/") {
          await fulfillJson(route, {
            count: 2,
            next: null,
            previous: null,
            results: [
              { id: 1, contract_value: "1000.00", budget: "800.00" },
              { id: 2, contract_value: "500.00", budget: "300.00" },
            ],
          });
          return true;
        }

        if (path === "/v1/procurement/purchase-orders/") {
          await fulfillJson(route, {
            count: 3,
            next: null,
            previous: null,
            results: [{ id: 1 }, { id: 2 }, { id: 3 }],
          });
          return true;
        }

        if (path === "/v1/finance/invoices/") {
          await fulfillJson(route, {
            count: 2,
            next: null,
            previous: null,
            results: [
              { id: 10, total_amount: "350.00" },
              { id: 11, total_amount: "150.00" },
            ],
          });
          return true;
        }

        if (path === "/v1/finance/progress-billings/") {
          await fulfillJson(route, {
            count: 1,
            next: null,
            previous: null,
            results: [{ id: 99 }],
          });
          return true;
        }

        return false;
      },
    ]);

    await page.goto("/dashboard");

    await expect(page.getByTestId("kpi-projects-count")).toHaveText("2");
    await expect(page.getByTestId("kpi-purchase-orders-count")).toHaveText("3");
    await expect(page.getByTestId("kpi-invoices-count")).toHaveText("2");
    await expect(page.getByTestId("kpi-progress-billings-count")).toHaveText("1");

    await expect(page.getByTestId("kpi-project-contract-total")).toHaveText(currencyFormatter.format(1500));
    await expect(page.getByTestId("kpi-invoice-total")).toHaveText(currencyFormatter.format(500));

    await expect(page.getByTestId("kpi-loading-status")).toHaveText("Ready");
    await expect(page.getByTestId("kpi-connection-status")).toHaveText("Connected");
  });

  test("shows issue status when KPI request fails", async ({ page }) => {
    await setAuthCookie(page);

    await mockBackendApi(page, [
      async ({ method, path, route }) => {
        if (method !== "GET") {
          return false;
        }

        if (
          path === "/v1/projects/projects/" ||
          path === "/v1/procurement/purchase-orders/" ||
          path === "/v1/finance/progress-billings/"
        ) {
          await fulfillJson(route, {
            count: 0,
            next: null,
            previous: null,
            results: [],
          });
          return true;
        }

        if (path === "/v1/finance/invoices/") {
          await fulfillJson(route, { detail: "KPI source unavailable" }, 500);
          return true;
        }

        return false;
      },
    ]);

    await page.goto("/dashboard");

    await expect(page.getByTestId("kpi-loading-status")).toHaveText("Ready");
    await expect(page.getByTestId("kpi-connection-status")).toHaveText("Issue");
  });
});
