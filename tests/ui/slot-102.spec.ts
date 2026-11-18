import { expect, test } from "@playwright/test";

test.describe("SLOT-102 Free time", () => {
  test("AC1: the booking page shows the service and its specialists", async ({ page }) => {
    await page.goto("/book/2");
    await expect(page.getByRole("heading", { level: 1, name: "Men's haircut" })).toBeVisible();
    await expect(page.getByRole("radio")).toHaveCount(2);
    await expect(page.getByRole("radio", { name: "Leo Park" })).toBeVisible();
    await expect(page.getByRole("radio", { name: "Mia Torres" })).toBeVisible();
  });

  test("AC2: picking a specialist and a date shows the free times", async ({ page }) => {
    await page.goto("/book/2");
    await page.getByRole("radio", { name: "Mia Torres" }).check();
    await page.getByLabel("Date").fill("2027-03-02");
    await expect(page.getByRole("group", { name: "Available times" }).getByRole("button")).toHaveText([
      "09:00", "09:30", "11:00", "11:30", "12:00", "12:30", "15:00", "15:30", "16:00", "16:30",
    ]);
  });

  test("AC3: a day without free times says so", async ({ page }) => {
    await page.goto("/book/2");
    await page.getByRole("radio", { name: "Mia Torres" }).check();
    await page.getByLabel("Date").fill("2027-03-07");
    await expect(page.getByText("No free times on this day")).toBeVisible();
  });

  test("AC4: a slot can be selected; changing the date clears the selection", async ({ page }) => {
    await page.goto("/book/2");
    await page.getByRole("radio", { name: "Mia Torres" }).check();
    await page.getByLabel("Date").fill("2027-03-04");
    const slot = page.getByRole("button", { name: "11:00" });
    await slot.click();
    await expect(slot).toHaveAttribute("aria-pressed", "true");
    await page.getByLabel("Date").fill("2027-03-05");
    await expect(page.getByRole("group", { name: "Available times" }).getByRole("button").first()).toBeVisible();
    await expect(page.locator('[aria-pressed="true"]')).toHaveCount(0);
  });

  test("AC5: unknown or archived service → 404 page", async ({ page }) => {
    for (const id of [9999, 7]) {
      const response = await page.goto(`/book/${id}`);
      expect(response?.status()).toBe(404);
    }
  });
});
