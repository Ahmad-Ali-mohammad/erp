import { expect, test } from "@playwright/test";

import { createTestJwt, mockBackendApi, setAuthCookie } from "../helpers/backend-mock";

function tokenWithClaims(roleSlug: string, permissions: string[]) {
  const now = Math.floor(Date.now() / 1000);
  return createTestJwt({
    user_id: 501,
    username: "claims.user",
    role_slug: roleSlug,
    permissions,
    exp: now + 60 * 60,
  });
}

test.describe("Access page", () => {
  test("shows explicit token claims and computed matrix", async ({ page }) => {
    await setAuthCookie(page, {
      accessToken: tokenWithClaims("viewer", ["finance.view_invoice", "finance.change_invoice"]),
    });

    await mockBackendApi(page, []);

    await page.goto("/dashboard/access");

    await expect(page.getByTestId("access-role-slug")).toHaveText("viewer");
    await expect(page.getByTestId("access-permissions-list")).toBeVisible();
    await expect(page.getByText("finance.view_invoice")).toBeVisible();
    await expect(page.getByText("finance.change_invoice")).toBeVisible();

    await expect(page.getByTestId("access-matrix-finance-view")).toHaveText("Yes");
    await expect(page.getByTestId("access-matrix-finance-manage")).toHaveText("Yes");
    await expect(page.getByTestId("access-matrix-finance-approve")).toHaveText("No");
    await expect(page.getByTestId("access-matrix-procurement-view")).toHaveText("No");
  });

  test("shows empty claims state when token has no permissions", async ({ page }) => {
    await setAuthCookie(page, {
      accessToken: tokenWithClaims("finance_manager", []),
    });

    await mockBackendApi(page, []);

    await page.goto("/dashboard/access");
    await expect(page.getByTestId("access-permissions-empty")).toBeVisible();
  });
});
