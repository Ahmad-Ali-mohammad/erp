import { expect, test } from "@playwright/test";

import { fulfillJson, mockBackendApi, paginated, setAuthCookie } from "../helpers/backend-mock";

test.describe("Permissions and guards", () => {
  test("shows forbidden message when list endpoint returns 403", async ({ page }) => {
    await setAuthCookie(page);

    await mockBackendApi(page, [
      async ({ method, path, route }) => {
        if (method === "GET" && path === "/v1/core/roles/") {
          await fulfillJson(route, { detail: "You do not have permission to view roles." }, 403);
          return true;
        }
        return false;
      },
    ]);

    await page.goto("/dashboard/admin/roles");
    await expect(page.getByText("You do not have permission to view roles.")).toBeVisible();
  });

  test("keeps action dialog open and shows message when workflow action is forbidden", async ({ page }) => {
    await setAuthCookie(page);

    const invoiceRow: Record<string, unknown> = {
      id: 44,
      invoice_number: "INV-044",
      invoice_type: "customer",
      partner_name: "Client Restricted",
      issue_date: "2026-02-10",
      total_amount: "4200.00",
      status: "pending_approval",
      created_at: "2026-02-09T10:00:00Z",
      submitted_at: "2026-02-10T09:30:00Z",
      approved_at: null,
      rejected_at: null,
      project: null,
    };

    let approveAttempted = false;

    await mockBackendApi(page, [
      async ({ method, path, route }) => {
        if (method === "GET" && path === "/v1/finance/invoices/") {
          await fulfillJson(route, paginated([invoiceRow]));
          return true;
        }

        if (method === "POST" && path === "/v1/finance/invoices/44/approve/") {
          approveAttempted = true;
          await fulfillJson(route, { detail: "You do not have permission to approve invoices." }, 403);
          return true;
        }

        return false;
      },
    ]);

    await page.goto("/dashboard/finance/invoices");
    await expect(page.getByText("INV-044")).toBeVisible();

    await page.getByTestId("row-action-approve-44").click();
    await expect(page.getByTestId("action-dialog")).toBeVisible();

    await page.getByTestId("action-dialog-confirm").click();

    await expect.poll(() => approveAttempted).toBe(true);
    await expect(page.getByTestId("action-dialog")).toBeVisible();
    await expect(page.getByTestId("action-dialog").getByText("You do not have permission to approve invoices.")).toBeVisible();
  });
});
