import { expect, test } from "@playwright/test";

import { createTestJwt, fulfillJson, mockBackendApi, paginated, setAuthCookie } from "../helpers/backend-mock";

function accessTokenWithRole(roleSlug: string, permissions?: string[]): string {
  const now = Math.floor(Date.now() / 1000);
  return createTestJwt({
    user_id: 101,
    username: "role.user",
    role_slug: roleSlug,
    permissions: permissions ?? [],
    exp: now + 60 * 60,
  });
}

test.describe("Role-aware UI", () => {
  test("shows only allowed sidebar groups for project manager", async ({ page }) => {
    await setAuthCookie(page, {
      accessToken: accessTokenWithRole("project_manager"),
    });

    await mockBackendApi(page, []);

    await page.goto("/dashboard");

    await expect(page.getByTestId("nav-group-overview")).toBeVisible();
    await expect(page.getByTestId("nav-group-projects")).toBeVisible();
    await expect(page.getByTestId("nav-group-procurement")).toHaveCount(0);
    await expect(page.getByTestId("nav-group-finance")).toHaveCount(0);
    await expect(page.getByTestId("nav-group-admin")).toHaveCount(0);

    await expect(page.getByTestId("nav-link-dashboard-projects")).toBeVisible();
    await expect(page.getByTestId("nav-link-dashboard-finance-invoices")).toHaveCount(0);
  });

  test("renders finance module as read-only for auditor role", async ({ page }) => {
    await setAuthCookie(page, {
      accessToken: accessTokenWithRole("auditor"),
    });

    const invoiceRow: Record<string, unknown> = {
      id: 1,
      invoice_number: "INV-RO-1",
      invoice_type: "customer",
      partner_name: "Read Only Client",
      issue_date: "2026-02-12",
      total_amount: "1000.00",
      status: "pending_approval",
      created_at: "2026-02-10T10:00:00Z",
      submitted_at: "2026-02-11T10:00:00Z",
      approved_at: null,
      rejected_at: null,
      project: null,
    };

    await mockBackendApi(page, [
      async ({ method, path, route }) => {
        if (method === "GET" && path === "/v1/finance/invoices/") {
          await fulfillJson(route, paginated([invoiceRow]));
          return true;
        }
        return false;
      },
    ]);

    await page.goto("/dashboard/finance/invoices");
    await expect(page.getByText("INV-RO-1")).toBeVisible();

    await expect(page.getByTestId("toolbar-create")).toHaveCount(0);
    await expect(page.getByTestId("row-edit-1")).toHaveCount(0);
    await expect(page.getByTestId("row-delete-1")).toHaveCount(0);
    await expect(page.getByTestId("row-action-submit-1")).toHaveCount(0);
    await expect(page.getByTestId("row-action-approve-1")).toHaveCount(0);
    await expect(page.getByTestId("row-action-reject-1")).toHaveCount(0);
  });

  test("redirects to access page for area without view access", async ({ page }) => {
    await setAuthCookie(page, {
      accessToken: accessTokenWithRole("accountant"),
    });

    await mockBackendApi(page, []);

    await page.goto("/dashboard/procurement/suppliers");
    await expect(page).toHaveURL(/\/dashboard\/access\?denied=procurement/);
    await expect(page.getByTestId("access-denied-banner")).toBeVisible();
  });

  test("uses permission claims to grant procurement access for accountant", async ({ page }) => {
    await setAuthCookie(page, {
      accessToken: accessTokenWithRole("accountant", ["procurement:view", "procurement:manage"]),
    });

    const supplierRow: Record<string, unknown> = {
      id: 1,
      code: "SUP-001",
      name: "Supplier Claim",
      tax_number: "300100200300400",
      is_active: true,
    };

    await mockBackendApi(page, [
      async ({ method, path, route }) => {
        if (method === "GET" && path === "/v1/procurement/suppliers/") {
          await fulfillJson(route, paginated([supplierRow]));
          return true;
        }
        return false;
      },
    ]);

    await page.goto("/dashboard");
    await expect(page.getByTestId("nav-group-procurement")).toBeVisible();
    await expect(page.getByTestId("nav-link-dashboard-procurement-suppliers")).toBeVisible();

    await page.goto("/dashboard/procurement/suppliers");
    await expect(page.getByTestId("resource-forbidden")).toHaveCount(0);
    await expect(page.getByText("SUP-001")).toBeVisible();
    await expect(page.getByTestId("toolbar-create")).toBeVisible();
  });

  test("uses permission claims to hide approve actions even for finance manager", async ({ page }) => {
    await setAuthCookie(page, {
      accessToken: accessTokenWithRole("finance_manager", ["finance:view", "finance:manage"]),
    });

    const invoiceRow: Record<string, unknown> = {
      id: 41,
      invoice_number: "INV-041",
      invoice_type: "customer",
      partner_name: "Claim Managed Client",
      issue_date: "2026-02-14",
      total_amount: "2400.00",
      status: "pending_approval",
      created_at: "2026-02-10T10:00:00Z",
      submitted_at: "2026-02-11T10:00:00Z",
      approved_at: null,
      rejected_at: null,
      project: null,
    };

    await mockBackendApi(page, [
      async ({ method, path, route }) => {
        if (method === "GET" && path === "/v1/finance/invoices/") {
          await fulfillJson(route, paginated([invoiceRow]));
          return true;
        }
        return false;
      },
    ]);

    await page.goto("/dashboard/finance/invoices");
    await expect(page.getByText("INV-041")).toBeVisible();

    await expect(page.getByTestId("toolbar-create")).toBeVisible();
    await expect(page.getByTestId("row-edit-41")).toBeVisible();
    await expect(page.getByTestId("row-action-submit-41")).toBeVisible();
    await expect(page.getByTestId("row-action-approve-41")).toHaveCount(0);
    await expect(page.getByTestId("row-action-reject-41")).toHaveCount(0);
  });

  test("supports django-style codename claims for finance manage without approve", async ({ page }) => {
    await setAuthCookie(page, {
      accessToken: accessTokenWithRole("viewer", ["finance.view_invoice", "finance.change_invoice"]),
    });

    const invoiceRow: Record<string, unknown> = {
      id: 52,
      invoice_number: "INV-052",
      invoice_type: "customer",
      partner_name: "Codename Client",
      issue_date: "2026-02-18",
      total_amount: "900.00",
      status: "pending_approval",
      created_at: "2026-02-10T10:00:00Z",
      submitted_at: "2026-02-11T10:00:00Z",
      approved_at: null,
      rejected_at: null,
      project: null,
    };

    await mockBackendApi(page, [
      async ({ method, path, route }) => {
        if (method === "GET" && path === "/v1/finance/invoices/") {
          await fulfillJson(route, paginated([invoiceRow]));
          return true;
        }
        return false;
      },
    ]);

    await page.goto("/dashboard/finance/invoices");
    await expect(page.getByText("INV-052")).toBeVisible();

    await expect(page.getByTestId("toolbar-create")).toBeVisible();
    await expect(page.getByTestId("row-edit-52")).toBeVisible();
    await expect(page.getByTestId("row-delete-52")).toBeVisible();
    await expect(page.getByTestId("row-action-submit-52")).toBeVisible();
    await expect(page.getByTestId("row-action-approve-52")).toHaveCount(0);
    await expect(page.getByTestId("row-action-reject-52")).toHaveCount(0);
  });
});
