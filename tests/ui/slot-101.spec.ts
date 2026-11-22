import { expect, test } from "@playwright/test";

test.describe("SLOT-101 Services page", () => {
  test("AC1: archived services are not shown", async ({ page }) => {
    await page.goto("/services");
    const list = page.getByRole("list", { name: "Services" });
    await expect(list.getByRole("listitem")).toHaveCount(6);
    await expect(page.getByText("Keratin treatment")).toHaveCount(0);
    await expect(page.getByText("Hot stone massage")).toHaveCount(0);
  });

  test("AC2: services are sorted by name", async ({ page }) => {
    await page.goto("/services");
    const headings = page.getByRole("list", { name: "Services" }).getByRole("heading", { level: 2 });
    await expect(headings.first()).toBeVisible();
    const names = await headings.allTextContents();
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "en")));
  });

  test("AC3: each service shows duration, price and a Book link", async ({ page }) => {
    await page.goto("/services");
    const item = page.getByRole("listitem", { name: "Hair coloring" });
    await expect(item).toContainText("2 h");
    await expect(item).toContainText("$120");
    await expect(item.getByRole("link", { name: "Book Hair coloring" })).toHaveAttribute("href", "/book/3");
  });
});
