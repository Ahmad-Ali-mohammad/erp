import { expect, test } from "@playwright/test";

test.describe("Authentication", () => {
  test("logs in successfully and redirects to dashboard", async ({ page }) => {
    await page.route("**/api/backend/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          count: 0,
          next: null,
          previous: null,
          results: [],
        }),
      });
    });

    await page.route("**/api/auth/login/", async (route) => {
      await page.context().addCookies([
        {
          name: "erp_access_token",
          value: "test-access-token",
          domain: "localhost",
          path: "/",
          httpOnly: false,
          secure: false,
          sameSite: "Lax",
        },
        {
          name: "erp_refresh_token",
          value: "test-refresh-token",
          domain: "localhost",
          path: "/",
          httpOnly: false,
          secure: false,
          sameSite: "Lax",
        },
      ]);

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.goto("/login");
    await page.locator("input[autocomplete='username']").fill("finance.user");
    await page.locator("input[autocomplete='current-password']").fill("P@ssw0rd!");
    await page.locator("button[type='submit']").click();

    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("shows backend validation error for invalid credentials", async ({ page }) => {
    await page.route("**/api/backend/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          count: 0,
          next: null,
          previous: null,
          results: [],
        }),
      });
    });

    await page.route("**/api/auth/login/", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ detail: "No active account found with the given credentials." }),
      });
    });

    await page.goto("/login");
    await page.locator("input[autocomplete='username']").fill("wrong.user");
    await page.locator("input[autocomplete='current-password']").fill("invalid-password");
    await page.locator("button[type='submit']").click();

    await expect(page.getByText("No active account found with the given credentials.")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });
});
