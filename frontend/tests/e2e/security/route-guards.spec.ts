import { expect, test } from "@playwright/test";

import { createTestJwt, mockBackendApi, setAuthCookie } from "../helpers/backend-mock";

function roleToken(roleSlug: string, permissions?: string[]) {
  const now = Math.floor(Date.now() / 1000);
  return createTestJwt({
    user_id: 901,
    username: "guard.user",
    role_slug: roleSlug,
    permissions: permissions ?? [],
    exp: now + 60 * 60,
  });
}

test.describe("Route-level guards", () => {
  test("redirects to access page when role tries to enter forbidden module", async ({ page }) => {
    await setAuthCookie(page, {
      accessToken: roleToken("accountant"),
    });

    await mockBackendApi(page, []);

    await page.goto("/dashboard/procurement/suppliers");
    await expect(page).toHaveURL(/\/dashboard\/access\?denied=procurement/);
    await expect(page.getByTestId("access-denied-banner")).toBeVisible();
  });

  test("allows module route when permission claim grants it", async ({ page }) => {
    await setAuthCookie(page, {
      accessToken: roleToken("accountant", ["procurement:view", "procurement:manage"]),
    });

    const supplierRow = {
      id: 1,
      code: "SUP-RG-1",
      name: "Guard Supplier",
      tax_number: "300100200300999",
      is_active: true,
    };

    await mockBackendApi(page, [
      async ({ method, path, route }) => {
        if (method === "GET" && path === "/v1/procurement/suppliers/") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              count: 1,
              next: null,
              previous: null,
              results: [supplierRow],
            }),
          });
          return true;
        }
        return false;
      },
    ]);

    await page.goto("/dashboard/procurement/suppliers");
    await expect(page).toHaveURL(/\/dashboard\/procurement\/suppliers$/);
    await expect(page.getByText("SUP-RG-1")).toBeVisible();
  });
});
