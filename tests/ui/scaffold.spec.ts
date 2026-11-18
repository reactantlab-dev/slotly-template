import { expect, test } from "@playwright/test";

test.describe("scaffold", () => {
  test("AC1: home redirects to the services catalog", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/services$/);
    await expect(page.getByRole("heading", { level: 1, name: "Services" })).toBeVisible();
  });

  test("AC2: each service shows a Book link", async ({ page }) => {
    await page.goto("/services");
    const list = page.getByRole("list", { name: "Services" });
    await expect(list.getByRole("listitem").first()).toBeVisible();
    await expect(list.getByRole("link", { name: /^Book / }).first()).toBeVisible();
  });
});
