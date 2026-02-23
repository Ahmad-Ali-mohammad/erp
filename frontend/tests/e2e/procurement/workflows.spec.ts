import { expect, test } from "@playwright/test";

import { fulfillJson, mockBackendApi, paginated, setAuthCookie } from "../helpers/backend-mock";

test.describe("Procurement workflows", () => {
  test("builds receive payload for purchase order line quantities", async ({ page }) => {
    await setAuthCookie(page);

    const purchaseOrderRow: Record<string, unknown> = {
      id: 1,
      order_number: "PO-001",
      project: 101,
      supplier: 501,
      order_date: "2026-02-02",
      total_amount: "5000.00",
      status: "sent",
      created_at: "2026-02-01T08:00:00Z",
      items: [{ id: 11, quantity: "10.000", received_quantity: "2.000" }],
    };

    let receivePayload: Record<string, unknown> | null = null;

    await mockBackendApi(page, [
      async ({ method, path, route, request }) => {
        if (method === "GET" && path === "/v1/procurement/purchase-orders/") {
          await fulfillJson(route, paginated([purchaseOrderRow]));
          return true;
        }

        if (method === "POST" && path === "/v1/procurement/purchase-orders/1/receive/") {
          receivePayload = (request.postDataJSON() as Record<string, unknown>) ?? null;
          const items = (purchaseOrderRow.items as Array<Record<string, unknown>> | undefined) ?? [];
          if (items[0]) {
            items[0].received_quantity = "5.000";
          }
          purchaseOrderRow.status = "partially_received";
          await fulfillJson(route, purchaseOrderRow);
          return true;
        }

        return false;
      },
    ]);

    await page.goto("/dashboard/procurement/purchase-orders");
    await expect(page.getByText("PO-001")).toBeVisible();

    await page.getByTestId("row-action-receive-1").click();
    await expect(page.getByTestId("action-dialog")).toBeVisible();

    await page.getByTestId("action-field-receive_11").fill("3");
    await page.getByTestId("action-dialog-confirm").click();

    await expect.poll(() => JSON.stringify(receivePayload)).toBe(JSON.stringify({ items: [{ item_id: 11, quantity: "3.000" }] }));
    await expect(page.getByTestId("action-dialog")).toBeHidden();
  });

  test("cancels sent purchase order workflow", async ({ page }) => {
    await setAuthCookie(page);

    const purchaseOrderRow: Record<string, unknown> = {
      id: 10,
      order_number: "PO-010",
      project: 101,
      supplier: 501,
      order_date: "2026-02-05",
      total_amount: "1200.00",
      status: "sent",
      created_at: "2026-02-04T08:00:00Z",
      items: [],
    };

    let cancelCalled = false;

    await mockBackendApi(page, [
      async ({ method, path, route }) => {
        if (method === "GET" && path === "/v1/procurement/purchase-orders/") {
          await fulfillJson(route, paginated([purchaseOrderRow]));
          return true;
        }

        if (method === "POST" && path === "/v1/procurement/purchase-orders/10/cancel/") {
          cancelCalled = true;
          purchaseOrderRow.status = "cancelled";
          await fulfillJson(route, purchaseOrderRow);
          return true;
        }

        return false;
      },
    ]);

    await page.goto("/dashboard/procurement/purchase-orders");
    await expect(page.getByText("PO-010")).toBeVisible();

    await page.getByTestId("row-action-cancel-10").click();
    await expect(page.getByTestId("action-dialog")).toBeVisible();
    await page.getByTestId("action-dialog-confirm").click();

    await expect.poll(() => cancelCalled).toBe(true);
    await expect(page.getByTestId("action-dialog")).toBeHidden();
    await expect(page.locator("tr").filter({ hasText: "PO-010" }).getByText("Cancelled")).toBeVisible();
  });

  test("submits purchase request then rejects with reason", async ({ page }) => {
    await setAuthCookie(page);

    const purchaseRequestRow: Record<string, unknown> = {
      id: 3,
      request_number: "PR-002",
      project: 101,
      needed_by: "2026-03-01",
      status: "draft",
      created_at: "2026-02-01T08:00:00Z",
      submitted_at: null,
      approved_at: null,
      rejected_at: null,
    };

    let submitCalled = false;
    let rejectPayload: Record<string, unknown> | null = null;

    await mockBackendApi(page, [
      async ({ method, path, route, request }) => {
        if (method === "GET" && path === "/v1/procurement/purchase-requests/") {
          await fulfillJson(route, paginated([purchaseRequestRow]));
          return true;
        }

        if (method === "POST" && path === "/v1/procurement/purchase-requests/3/submit/") {
          submitCalled = true;
          purchaseRequestRow.status = "pending_approval";
          purchaseRequestRow.submitted_at = "2026-02-02T08:00:00Z";
          await fulfillJson(route, purchaseRequestRow);
          return true;
        }

        if (method === "POST" && path === "/v1/procurement/purchase-requests/3/reject/") {
          rejectPayload = (request.postDataJSON() as Record<string, unknown>) ?? null;
          purchaseRequestRow.status = "rejected";
          purchaseRequestRow.rejected_at = "2026-02-03T08:00:00Z";
          await fulfillJson(route, purchaseRequestRow);
          return true;
        }

        return false;
      },
    ]);

    await page.goto("/dashboard/procurement/purchase-requests");
    await expect(page.getByText("PR-002")).toBeVisible();

    await page.getByTestId("row-action-submit-3").click();
    await expect(page.getByTestId("action-dialog")).toBeVisible();
    await page.getByTestId("action-dialog-confirm").click();
    await expect.poll(() => submitCalled).toBe(true);
    await expect(page.getByTestId("action-dialog")).toBeHidden();

    await page.getByTestId("row-action-reject-3").click();
    await expect(page.getByTestId("action-dialog")).toBeVisible();
    await page.getByTestId("action-dialog-confirm").click();
    await expect(page.getByText("Field Reason is required.")).toBeVisible();

    await page.getByTestId("action-field-reason").fill("Scope not approved");
    await page.getByTestId("action-dialog-confirm").click();
    await expect.poll(() => JSON.stringify(rejectPayload)).toBe(JSON.stringify({ reason: "Scope not approved" }));
    await expect(page.getByTestId("action-dialog")).toBeHidden();

    const requestRowLocator = page.locator("tr").filter({ hasText: "PR-002" });
    await expect(requestRowLocator.getByText("Rejected")).toBeVisible();
  });
});
