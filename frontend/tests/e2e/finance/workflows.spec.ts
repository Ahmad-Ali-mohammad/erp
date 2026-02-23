import { expect, test } from "@playwright/test";

import { fulfillJson, mockBackendApi, paginated, setAuthCookie } from "../helpers/backend-mock";

test.describe("Finance workflows", () => {
  test("requires reason on invoice reject and sends payload", async ({ page }) => {
    await setAuthCookie(page);

    const invoiceRow: Record<string, unknown> = {
      id: 1,
      invoice_number: "INV-001",
      invoice_type: "customer",
      partner_name: "Client A",
      issue_date: "2026-02-01",
      total_amount: "1200.00",
      status: "pending_approval",
      project: null,
      created_at: "2026-01-20T10:00:00Z",
      submitted_at: "2026-01-21T10:00:00Z",
      approved_at: null,
      rejected_at: null,
    };

    let rejectPayload: Record<string, unknown> | null = null;

    await mockBackendApi(page, [
      async ({ method, path, route, request }) => {
        if (method === "GET" && path === "/v1/finance/invoices/") {
          await fulfillJson(route, paginated([invoiceRow]));
          return true;
        }

        if (method === "POST" && path === "/v1/finance/invoices/1/reject/") {
          rejectPayload = (request.postDataJSON() as Record<string, unknown>) ?? null;
          invoiceRow.status = "rejected";
          invoiceRow.rejected_at = "2026-01-22T10:00:00Z";
          await fulfillJson(route, invoiceRow);
          return true;
        }

        return false;
      },
    ]);

    await page.goto("/dashboard/finance/invoices");
    await expect(page.getByText("INV-001")).toBeVisible();

    await page.getByTestId("row-action-reject-1").click();
    await expect(page.getByTestId("action-dialog")).toBeVisible();

    await page.getByTestId("action-dialog-confirm").click();
    await expect(page.getByText("Field Reason is required.")).toBeVisible();

    await page.getByTestId("action-field-reason").fill("Missing supporting documents");
    await page.getByTestId("action-dialog-confirm").click();

    await expect.poll(() => JSON.stringify(rejectPayload)).toBe(
      JSON.stringify({ reason: "Missing supporting documents" }),
    );
    await expect(page.getByTestId("action-dialog")).toBeHidden();
  });

  test("submits and approves invoice workflow", async ({ page }) => {
    await setAuthCookie(page);

    const invoiceRow: Record<string, unknown> = {
      id: 2,
      invoice_number: "INV-002",
      invoice_type: "customer",
      partner_name: "Client B",
      issue_date: "2026-02-03",
      total_amount: "3200.00",
      status: "draft",
      project: null,
      created_at: "2026-01-24T10:00:00Z",
      submitted_at: null,
      approved_at: null,
      rejected_at: null,
    };

    let submitCalled = false;
    let approveCalled = false;

    await mockBackendApi(page, [
      async ({ method, path, route }) => {
        if (method === "GET" && path === "/v1/finance/invoices/") {
          await fulfillJson(route, paginated([invoiceRow]));
          return true;
        }

        if (method === "POST" && path === "/v1/finance/invoices/2/submit/") {
          submitCalled = true;
          invoiceRow.status = "pending_approval";
          invoiceRow.submitted_at = "2026-01-25T10:00:00Z";
          await fulfillJson(route, invoiceRow);
          return true;
        }

        if (method === "POST" && path === "/v1/finance/invoices/2/approve/") {
          approveCalled = true;
          invoiceRow.status = "issued";
          invoiceRow.approved_at = "2026-01-26T10:00:00Z";
          await fulfillJson(route, invoiceRow);
          return true;
        }

        return false;
      },
    ]);

    await page.goto("/dashboard/finance/invoices");
    await expect(page.getByText("INV-002")).toBeVisible();

    await page.getByTestId("row-action-submit-2").click();
    await expect(page.getByTestId("action-dialog")).toBeVisible();
    await page.getByTestId("action-dialog-confirm").click();
    await expect.poll(() => submitCalled).toBe(true);
    await expect(page.getByTestId("action-dialog")).toBeHidden();

    const invoiceRowLocator = page.locator("tr").filter({ hasText: "INV-002" });
    await expect(invoiceRowLocator.getByText("Pending Approval")).toBeVisible();

    await page.getByTestId("row-action-approve-2").click();
    await expect(page.getByTestId("action-dialog")).toBeVisible();
    await page.getByTestId("action-dialog-confirm").click();
    await expect.poll(() => approveCalled).toBe(true);
    await expect(page.getByTestId("action-dialog")).toBeHidden();
    await expect(invoiceRowLocator.getByText("Issued")).toBeVisible();
  });

  test("blocks invoice approve action when status is draft", async ({ page }) => {
    await setAuthCookie(page);

    const invoiceRow: Record<string, unknown> = {
      id: 12,
      invoice_number: "INV-012",
      invoice_type: "customer",
      partner_name: "Client D",
      issue_date: "2026-02-04",
      total_amount: "1500.00",
      status: "draft",
      project: null,
      created_at: "2026-01-28T10:00:00Z",
      submitted_at: null,
      approved_at: null,
      rejected_at: null,
    };

    let approveAttempted = false;

    await mockBackendApi(page, [
      async ({ method, path, route }) => {
        if (method === "GET" && path === "/v1/finance/invoices/") {
          await fulfillJson(route, paginated([invoiceRow]));
          return true;
        }

        if (method === "POST" && path === "/v1/finance/invoices/12/approve/") {
          approveAttempted = true;
          await fulfillJson(route, { detail: "Only submitted invoices can be approved." }, 400);
          return true;
        }

        return false;
      },
    ]);

    await page.goto("/dashboard/finance/invoices");
    await expect(page.getByText("INV-012")).toBeVisible();

    await page.getByTestId("row-action-approve-12").click();
    await expect(page.getByTestId("action-dialog")).toBeVisible();
    await page.getByTestId("action-dialog-confirm").click();

    await expect.poll(() => approveAttempted).toBe(true);
    await expect(page.getByTestId("action-dialog")).toBeVisible();
    await expect(page.getByTestId("action-dialog").getByText("Only submitted invoices can be approved.")).toBeVisible();

    const invoiceRowLocator = page.locator("tr").filter({ hasText: "INV-012" });
    await expect(invoiceRowLocator.getByText("Draft")).toBeVisible();
  });

  test("submits revenue recognition then rejects with reason", async ({ page }) => {
    await setAuthCookie(page);

    const revenueRow: Record<string, unknown> = {
      id: 5,
      entry_number: "REV-100",
      method: "percentage_of_completion",
      recognition_date: "2026-02-10",
      recognized_amount: "1200.00",
      status: "draft",
      created_at: "2026-02-06T10:00:00Z",
      submitted_at: null,
      approved_at: null,
      rejected_at: null,
      project: 301,
    };

    let submitCalled = false;
    let rejectPayload: Record<string, unknown> | null = null;

    await mockBackendApi(page, [
      async ({ method, path, route, request }) => {
        if (method === "GET" && path === "/v1/finance/revenue-recognition/") {
          await fulfillJson(route, paginated([revenueRow]));
          return true;
        }

        if (method === "POST" && path === "/v1/finance/revenue-recognition/5/submit/") {
          submitCalled = true;
          revenueRow.status = "pending_approval";
          revenueRow.submitted_at = "2026-02-07T10:00:00Z";
          await fulfillJson(route, revenueRow);
          return true;
        }

        if (method === "POST" && path === "/v1/finance/revenue-recognition/5/reject/") {
          rejectPayload = (request.postDataJSON() as Record<string, unknown>) ?? null;
          revenueRow.status = "rejected";
          revenueRow.rejected_at = "2026-02-08T10:00:00Z";
          await fulfillJson(route, revenueRow);
          return true;
        }

        return false;
      },
    ]);

    await page.goto("/dashboard/finance/revenue-recognition");
    await expect(page.getByText("REV-100")).toBeVisible();

    await page.getByTestId("row-action-submit-5").click();
    await expect(page.getByTestId("action-dialog")).toBeVisible();
    await page.getByTestId("action-dialog-confirm").click();
    await expect.poll(() => submitCalled).toBe(true);
    await expect(page.getByTestId("action-dialog")).toBeHidden();

    await page.getByTestId("row-action-reject-5").click();
    await expect(page.getByTestId("action-dialog")).toBeVisible();
    await page.getByTestId("action-dialog-confirm").click();
    await expect(page.getByText("Field Reason is required.")).toBeVisible();

    await page.getByTestId("action-field-reason").fill("Recognition basis is not validated");
    await page.getByTestId("action-dialog-confirm").click();
    await expect.poll(() => JSON.stringify(rejectPayload)).toBe(
      JSON.stringify({ reason: "Recognition basis is not validated" }),
    );
    await expect(page.getByTestId("action-dialog")).toBeHidden();

    const revenueRowLocator = page.locator("tr").filter({ hasText: "REV-100" });
    await expect(revenueRowLocator.getByText("Rejected")).toBeVisible();
  });

  test("generates invoice from approved progress billing", async ({ page }) => {
    await setAuthCookie(page);

    const progressBillingRow: Record<string, unknown> = {
      id: 7,
      billing_number: "PB-100",
      billing_date: "2026-02-15",
      completion_percentage: "35.00",
      total_amount: "4025.00",
      linked_invoice: null,
      status: "approved",
      created_at: "2026-02-10T10:00:00Z",
      submitted_at: "2026-02-11T10:00:00Z",
      approved_at: "2026-02-12T10:00:00Z",
      rejected_at: null,
      project: 55,
    };

    let generateInvoiceCalled = false;

    await mockBackendApi(page, [
      async ({ method, path, route }) => {
        if (method === "GET" && path === "/v1/finance/progress-billings/") {
          await fulfillJson(route, paginated([progressBillingRow]));
          return true;
        }

        if (method === "POST" && path === "/v1/finance/progress-billings/7/generate-invoice/") {
          generateInvoiceCalled = true;
          progressBillingRow.status = "invoiced";
          progressBillingRow.linked_invoice = 901;
          await fulfillJson(route, progressBillingRow);
          return true;
        }

        return false;
      },
    ]);

    await page.goto("/dashboard/finance/progress-billings");
    await expect(page.getByText("PB-100")).toBeVisible();

    await page.getByTestId("row-action-generate-invoice-7").click();
    await expect(page.getByTestId("action-dialog")).toBeVisible();
    await page.getByTestId("action-dialog-confirm").click();

    await expect.poll(() => generateInvoiceCalled).toBe(true);
    await expect(page.getByTestId("action-dialog")).toBeHidden();
    await expect(page.getByText("#901")).toBeVisible();
  });

  test("approves progress billing then generates invoice", async ({ page }) => {
    await setAuthCookie(page);

    const progressBillingRow: Record<string, unknown> = {
      id: 8,
      billing_number: "PB-200",
      billing_date: "2026-02-16",
      completion_percentage: "42.00",
      total_amount: "5750.00",
      linked_invoice: null,
      status: "pending_approval",
      created_at: "2026-02-10T10:00:00Z",
      submitted_at: "2026-02-11T10:00:00Z",
      approved_at: null,
      rejected_at: null,
      project: 77,
    };

    let approveCalled = false;
    let generateInvoiceCalled = false;

    await mockBackendApi(page, [
      async ({ method, path, route }) => {
        if (method === "GET" && path === "/v1/finance/progress-billings/") {
          await fulfillJson(route, paginated([progressBillingRow]));
          return true;
        }

        if (method === "POST" && path === "/v1/finance/progress-billings/8/approve/") {
          approveCalled = true;
          progressBillingRow.status = "approved";
          progressBillingRow.approved_at = "2026-02-12T11:30:00Z";
          await fulfillJson(route, progressBillingRow);
          return true;
        }

        if (method === "POST" && path === "/v1/finance/progress-billings/8/generate-invoice/") {
          generateInvoiceCalled = true;
          progressBillingRow.status = "invoiced";
          progressBillingRow.linked_invoice = 902;
          await fulfillJson(route, progressBillingRow);
          return true;
        }

        return false;
      },
    ]);

    await page.goto("/dashboard/finance/progress-billings");
    await expect(page.getByText("PB-200")).toBeVisible();

    await page.getByTestId("row-action-approve-8").click();
    await expect(page.getByTestId("action-dialog")).toBeVisible();
    await page.getByTestId("action-dialog-confirm").click();
    await expect.poll(() => approveCalled).toBe(true);
    await expect(page.getByTestId("action-dialog")).toBeHidden();

    await page.getByTestId("row-action-generate-invoice-8").click();
    await expect(page.getByTestId("action-dialog")).toBeVisible();
    await page.getByTestId("action-dialog-confirm").click();
    await expect.poll(() => generateInvoiceCalled).toBe(true);
    await expect(page.getByTestId("action-dialog")).toBeHidden();
    await expect(page.getByText("#902")).toBeVisible();
  });

  test("shows API error when generate invoice is attempted before approval", async ({ page }) => {
    await setAuthCookie(page);

    const progressBillingRow: Record<string, unknown> = {
      id: 9,
      billing_number: "PB-300",
      billing_date: "2026-02-18",
      completion_percentage: "20.00",
      total_amount: "2000.00",
      linked_invoice: null,
      status: "draft",
      created_at: "2026-02-11T10:00:00Z",
      submitted_at: null,
      approved_at: null,
      rejected_at: null,
      project: 88,
    };

    let generateInvoiceAttempted = false;

    await mockBackendApi(page, [
      async ({ method, path, route }) => {
        if (method === "GET" && path === "/v1/finance/progress-billings/") {
          await fulfillJson(route, paginated([progressBillingRow]));
          return true;
        }

        if (method === "POST" && path === "/v1/finance/progress-billings/9/generate-invoice/") {
          generateInvoiceAttempted = true;
          await fulfillJson(route, { detail: "Only approved progress billings can generate an invoice." }, 400);
          return true;
        }

        return false;
      },
    ]);

    await page.goto("/dashboard/finance/progress-billings");
    await expect(page.getByText("PB-300")).toBeVisible();

    await page.getByTestId("row-action-generate-invoice-9").click();
    await expect(page.getByTestId("action-dialog")).toBeVisible();
    await page.getByTestId("action-dialog-confirm").click();

    await expect.poll(() => generateInvoiceAttempted).toBe(true);
    await expect(page.getByTestId("action-dialog")).toBeVisible();
    await expect(
      page.getByTestId("action-dialog").getByText("Only approved progress billings can generate an invoice."),
    ).toBeVisible();
  });

  test("approves pending payment workflow", async ({ page }) => {
    await setAuthCookie(page);

    const paymentRow: Record<string, unknown> = {
      id: 21,
      invoice: 1001,
      payment_date: "2026-02-20",
      amount: "900.00",
      method: "bank_transfer",
      reference_no: "TX-900",
      status: "pending",
      created_at: "2026-02-19T10:00:00Z",
      submitted_at: "2026-02-19T11:00:00Z",
      approved_at: null,
      rejected_at: null,
    };

    let approveCalled = false;

    await mockBackendApi(page, [
      async ({ method, path, route }) => {
        if (method === "GET" && path === "/v1/finance/payments/") {
          await fulfillJson(route, paginated([paymentRow]));
          return true;
        }

        if (method === "POST" && path === "/v1/finance/payments/21/approve/") {
          approveCalled = true;
          paymentRow.status = "confirmed";
          paymentRow.approved_at = "2026-02-20T09:30:00Z";
          await fulfillJson(route, paymentRow);
          return true;
        }

        return false;
      },
    ]);

    await page.goto("/dashboard/finance/payments");
    await expect(page.getByText("1001")).toBeVisible();

    await page.getByTestId("row-action-approve-21").click();
    await expect(page.getByTestId("action-dialog")).toBeVisible();
    await page.getByTestId("action-dialog-confirm").click();

    await expect.poll(() => approveCalled).toBe(true);
    await expect(page.getByTestId("action-dialog")).toBeHidden();

    const paymentRowLocator = page.locator("tr").filter({ hasText: "1001" });
    await expect(paymentRowLocator.getByText("Confirmed")).toBeVisible();
  });
});
