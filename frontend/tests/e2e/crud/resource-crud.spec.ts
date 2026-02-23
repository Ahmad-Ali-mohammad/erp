import { expect, test } from "@playwright/test";

import { mockBackendApi, paginated, setAuthCookie } from "../helpers/backend-mock";

test.describe("Resource CRUD", () => {
  test("creates, edits, and deletes roles", async ({ page }) => {
    await setAuthCookie(page);

    const roles: Array<Record<string, unknown>> = [
      {
        id: 1,
        name: "Admin",
        slug: "admin",
        description: "System administrator",
        is_system: true,
      },
    ];

    let createPayload: Record<string, unknown> | null = null;
    let editPayload: Record<string, unknown> | null = null;
    let deleteCalled = false;

    await mockBackendApi(page, [
      async ({ method, path, route, request }) => {
        if (method === "GET" && path === "/v1/core/roles/") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(paginated(roles)),
          });
          return true;
        }

        if (method === "POST" && path === "/v1/core/roles/") {
          createPayload = (request.postDataJSON() as Record<string, unknown>) ?? null;
          const createdRole: Record<string, unknown> = {
            id: 2,
            name: createPayload?.name ?? "Role 2",
            slug: createPayload?.slug ?? "role-2",
            description: createPayload?.description ?? "",
            is_system: Boolean(createPayload?.is_system),
          };
          roles.push(createdRole);
          await route.fulfill({
            status: 201,
            contentType: "application/json",
            body: JSON.stringify(createdRole),
          });
          return true;
        }

        if (method === "PATCH" && path === "/v1/core/roles/2/") {
          editPayload = (request.postDataJSON() as Record<string, unknown>) ?? null;
          const targetRole = roles.find((row) => row.id === 2);
          if (targetRole) {
            Object.assign(targetRole, editPayload);
          }
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(targetRole ?? {}),
          });
          return true;
        }

        if (method === "DELETE" && path === "/v1/core/roles/2/") {
          deleteCalled = true;
          const index = roles.findIndex((row) => row.id === 2);
          if (index >= 0) {
            roles.splice(index, 1);
          }
          await route.fulfill({ status: 204, body: "" });
          return true;
        }

        return false;
      },
    ]);

    await page.goto("/dashboard/admin/roles");
    await expect(page.getByTestId("row-edit-1")).toBeVisible();

    await page.getByTestId("toolbar-create").click();
    await expect(page.getByTestId("crud-dialog")).toBeVisible();
    await page.getByTestId("crud-field-name").fill("Cost Controller");
    await page.getByTestId("crud-field-slug").fill("cost-controller");
    await page.getByTestId("crud-field-description").fill("Controls project cost postings");
    await page.getByTestId("crud-dialog-submit").click();

    await expect.poll(() => JSON.stringify(createPayload)).toBe(
      JSON.stringify({
        name: "Cost Controller",
        slug: "cost-controller",
        description: "Controls project cost postings",
        is_system: false,
      }),
    );
    await expect(page.getByText("Cost Controller")).toBeVisible();

    await page.getByTestId("row-edit-2").click();
    await expect(page.getByTestId("crud-dialog")).toBeVisible();
    await page.getByTestId("crud-field-name").fill("Cost Control Lead");
    await page.getByTestId("crud-dialog-submit").click();

    await expect.poll(() => JSON.stringify(editPayload)).toContain("Cost Control Lead");
    await expect(page.getByText("Cost Control Lead")).toBeVisible();

    await page.getByTestId("row-delete-2").click();
    await expect(page.getByTestId("delete-dialog")).toBeVisible();
    await page.getByTestId("delete-dialog-confirm").click();

    await expect.poll(() => deleteCalled).toBe(true);
    await expect(page.getByText("Cost Control Lead")).toHaveCount(0);
  });

  test("creates supplier with inactive status then deletes it", async ({ page }) => {
    await setAuthCookie(page);

    const suppliers: Array<Record<string, unknown>> = [
      {
        id: 1,
        code: "SUP-001",
        name: "Supplier A",
        tax_number: "300111222200003",
        phone: "0500000001",
        email: "a@supplier.test",
        is_active: true,
      },
    ];

    let createPayload: Record<string, unknown> | null = null;
    let deleteCalled = false;

    await mockBackendApi(page, [
      async ({ method, path, route, request }) => {
        if (method === "GET" && path === "/v1/procurement/suppliers/") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(paginated(suppliers)),
          });
          return true;
        }

        if (method === "POST" && path === "/v1/procurement/suppliers/") {
          createPayload = (request.postDataJSON() as Record<string, unknown>) ?? null;
          const createdSupplier: Record<string, unknown> = {
            id: 2,
            code: createPayload?.code ?? "SUP-002",
            name: createPayload?.name ?? "Supplier B",
            tax_number: createPayload?.tax_number ?? "",
            phone: createPayload?.phone ?? "",
            email: createPayload?.email ?? "",
            is_active: Boolean(createPayload?.is_active),
          };
          suppliers.push(createdSupplier);
          await route.fulfill({
            status: 201,
            contentType: "application/json",
            body: JSON.stringify(createdSupplier),
          });
          return true;
        }

        if (method === "DELETE" && path === "/v1/procurement/suppliers/2/") {
          deleteCalled = true;
          const index = suppliers.findIndex((row) => row.id === 2);
          if (index >= 0) {
            suppliers.splice(index, 1);
          }
          await route.fulfill({ status: 204, body: "" });
          return true;
        }

        return false;
      },
    ]);

    await page.goto("/dashboard/procurement/suppliers");
    await expect(page.getByText("SUP-001")).toBeVisible();

    await page.getByTestId("toolbar-create").click();
    await expect(page.getByTestId("crud-dialog")).toBeVisible();
    await page.getByTestId("crud-field-code").fill("SUP-002");
    await page.getByTestId("crud-field-name").fill("Supplier B");
    await page.getByTestId("crud-field-tax_number").fill("300111222200004");
    await page.getByTestId("crud-field-email").fill("b@supplier.test");
    await page.getByTestId("crud-field-is_active").uncheck();
    await page.getByTestId("crud-dialog-submit").click();

    await expect.poll(() => JSON.stringify(createPayload)).toBe(
      JSON.stringify({
        code: "SUP-002",
        name: "Supplier B",
        tax_number: "300111222200004",
        email: "b@supplier.test",
        is_active: false,
      }),
    );
    await expect(page.getByText("SUP-002")).toBeVisible();

    await page.getByTestId("row-delete-2").click();
    await expect(page.getByTestId("delete-dialog")).toBeVisible();
    await page.getByTestId("delete-dialog-confirm").click();

    await expect.poll(() => deleteCalled).toBe(true);
    await expect(page.getByText("SUP-002")).toHaveCount(0);
  });

  test("creates account with parent selection", async ({ page }) => {
    await setAuthCookie(page);

    const accounts: Array<Record<string, unknown>> = [
      {
        id: 1,
        code: "1110",
        name: "Cash",
        account_type: "asset",
        parent: null,
        is_active: true,
        is_control_account: false,
      },
    ];

    let createPayload: Record<string, unknown> | null = null;

    await mockBackendApi(page, [
      async ({ method, path, route, request }) => {
        if (method === "GET" && path === "/v1/finance/accounts/") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(paginated(accounts)),
          });
          return true;
        }

        if (method === "POST" && path === "/v1/finance/accounts/") {
          createPayload = (request.postDataJSON() as Record<string, unknown>) ?? null;
          const createdAccount: Record<string, unknown> = {
            id: 2,
            code: createPayload?.code ?? "1120",
            name: createPayload?.name ?? "Petty Cash",
            account_type: createPayload?.account_type ?? "asset",
            parent: createPayload?.parent ?? "1",
            is_active: Boolean(createPayload?.is_active),
            is_control_account: Boolean(createPayload?.is_control_account),
          };
          accounts.push(createdAccount);
          await route.fulfill({
            status: 201,
            contentType: "application/json",
            body: JSON.stringify(createdAccount),
          });
          return true;
        }

        return false;
      },
    ]);

    await page.goto("/dashboard/finance/accounts");
    await expect(page.getByText("1110")).toBeVisible();

    await page.getByTestId("toolbar-create").click();
    await expect(page.getByTestId("crud-dialog")).toBeVisible();
    await page.getByTestId("crud-field-code").fill("1120");
    await page.getByTestId("crud-field-name").fill("Petty Cash");
    await page.getByTestId("crud-field-account_type").selectOption("asset");
    await page.getByTestId("crud-field-parent").selectOption("1");
    await page.getByTestId("crud-dialog-submit").click();

    await expect.poll(() => JSON.stringify(createPayload)).toBe(
      JSON.stringify({
        code: "1120",
        name: "Petty Cash",
        account_type: "asset",
        parent: "1",
        is_active: true,
        is_control_account: false,
      }),
    );
    await expect(page.getByText("Petty Cash")).toBeVisible();
  });
});
