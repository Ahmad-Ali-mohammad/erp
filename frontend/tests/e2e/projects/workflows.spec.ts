import { expect, test } from "@playwright/test";

import { fulfillJson, mockBackendApi, paginated, setAuthCookie } from "../helpers/backend-mock";

test.describe("Projects workflows", () => {
  test("submits and approves change order workflow", async ({ page }) => {
    await setAuthCookie(page);

    const changeOrderRow: Record<string, unknown> = {
      id: 4,
      order_number: "CO-100",
      title: "Additional scope",
      project: 201,
      total_contract_value_delta: "1500.00",
      total_budget_delta: "900.00",
      status: "draft",
      created_at: "2026-02-05T10:00:00Z",
      submitted_at: null,
      approved_at: null,
      rejected_at: null,
    };

    let submitCalled = false;
    let approveCalled = false;

    await mockBackendApi(page, [
      async ({ method, path, route }) => {
        if (method === "GET" && path === "/v1/projects/change-orders/") {
          await fulfillJson(route, paginated([changeOrderRow]));
          return true;
        }

        if (method === "POST" && path === "/v1/projects/change-orders/4/submit/") {
          submitCalled = true;
          changeOrderRow.status = "pending_approval";
          changeOrderRow.submitted_at = "2026-02-06T10:00:00Z";
          await fulfillJson(route, changeOrderRow);
          return true;
        }

        if (method === "POST" && path === "/v1/projects/change-orders/4/approve/") {
          approveCalled = true;
          changeOrderRow.status = "approved";
          changeOrderRow.approved_at = "2026-02-07T10:00:00Z";
          await fulfillJson(route, changeOrderRow);
          return true;
        }

        return false;
      },
    ]);

    await page.goto("/dashboard/projects/change-orders");
    await expect(page.getByText("CO-100")).toBeVisible();

    await page.getByTestId("row-action-submit-4").click();
    await expect(page.getByTestId("action-dialog")).toBeVisible();
    await page.getByTestId("action-dialog-confirm").click();
    await expect.poll(() => submitCalled).toBe(true);
    await expect(page.getByTestId("action-dialog")).toBeHidden();

    const changeOrderRowLocator = page.locator("tr").filter({ hasText: "CO-100" });
    await expect(changeOrderRowLocator.getByText("Pending Approval")).toBeVisible();

    await page.getByTestId("row-action-approve-4").click();
    await expect(page.getByTestId("action-dialog")).toBeVisible();
    await page.getByTestId("action-dialog-confirm").click();
    await expect.poll(() => approveCalled).toBe(true);
    await expect(page.getByTestId("action-dialog")).toBeHidden();
    await expect(changeOrderRowLocator.getByText("Approved")).toBeVisible();
  });

  test("blocks change order approve action when status is draft", async ({ page }) => {
    await setAuthCookie(page);

    const changeOrderRow: Record<string, unknown> = {
      id: 13,
      order_number: "CO-130",
      title: "New variation",
      project: 205,
      total_contract_value_delta: "1000.00",
      total_budget_delta: "600.00",
      status: "draft",
      created_at: "2026-02-05T10:00:00Z",
      submitted_at: null,
      approved_at: null,
      rejected_at: null,
    };

    let approveAttempted = false;

    await mockBackendApi(page, [
      async ({ method, path, route }) => {
        if (method === "GET" && path === "/v1/projects/change-orders/") {
          await fulfillJson(route, paginated([changeOrderRow]));
          return true;
        }

        if (method === "POST" && path === "/v1/projects/change-orders/13/approve/") {
          approveAttempted = true;
          await fulfillJson(route, { detail: "Only submitted change orders can be approved." }, 400);
          return true;
        }

        return false;
      },
    ]);

    await page.goto("/dashboard/projects/change-orders");
    await expect(page.getByText("CO-130")).toBeVisible();

    await page.getByTestId("row-action-approve-13").click();
    await expect(page.getByTestId("action-dialog")).toBeVisible();
    await page.getByTestId("action-dialog-confirm").click();

    await expect.poll(() => approveAttempted).toBe(true);
    await expect(page.getByTestId("action-dialog")).toBeVisible();
    await expect(
      page.getByTestId("action-dialog").getByText("Only submitted change orders can be approved."),
    ).toBeVisible();

    const changeOrderRowLocator = page.locator("tr").filter({ hasText: "CO-130" });
    await expect(changeOrderRowLocator.getByText("Draft")).toBeVisible();
  });

  test("closes active project workflow", async ({ page }) => {
    await setAuthCookie(page);

    const projectRow: Record<string, unknown> = {
      id: 30,
      code: "PRJ-030",
      name: "West Block",
      client_name: "Client West",
      contract_value: "750000.00",
      budget: "620000.00",
      currency: "SAR",
      status: "active",
      created_at: "2026-02-01T08:00:00Z",
    };

    let closeCalled = false;

    await mockBackendApi(page, [
      async ({ method, path, route }) => {
        if (method === "GET" && path === "/v1/projects/projects/") {
          await fulfillJson(route, paginated([projectRow]));
          return true;
        }

        if (method === "POST" && path === "/v1/projects/projects/30/close/") {
          closeCalled = true;
          projectRow.status = "completed";
          await fulfillJson(route, projectRow);
          return true;
        }

        return false;
      },
    ]);

    await page.goto("/dashboard/projects");
    await expect(page.getByText("PRJ-030")).toBeVisible();

    await page.getByTestId("row-action-close-30").click();
    await expect(page.getByTestId("action-dialog")).toBeVisible();
    await page.getByTestId("action-dialog-confirm").click();

    await expect.poll(() => closeCalled).toBe(true);
    await expect(page.getByTestId("action-dialog")).toBeHidden();
    await expect(page.locator("tr").filter({ hasText: "PRJ-030" }).getByText("Completed")).toBeVisible();
  });
});
