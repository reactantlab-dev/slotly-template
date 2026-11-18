import { expect, test } from "@playwright/test";
import { at } from "../support/fixtures";
import { bookViaApi, signUp } from "../support/ui";

// now = Monday 2027-03-01 10:00. Bookings in this file: Ava today 10:30, Mia Monday 2027-03-08.
const NEXT_MONDAY = "2027-03-08";

test.describe("SLOT-203 Reschedule a booking", () => {
  test("AC1: a client moves a booking to another free time", async ({ page }) => {
    await signUp(page);
    await bookViaApi(page, { serviceId: 2, specialistId: 1, startsAt: at(NEXT_MONDAY, "09:00") });
    await page.goto("/my-bookings");
    await page.getByRole("listitem", { name: "Men's haircut with Mia Torres" }).getByRole("link", { name: "Reschedule" }).click();
    await expect(page).toHaveURL(/\/my-bookings\/\d+\/reschedule$/);
    await expect(page.getByRole("heading", { level: 1, name: "Reschedule" })).toBeVisible();
    await expect(page.getByText("Mon, Mar 8 · 09:00")).toBeVisible();
    await page.getByLabel("Date").fill(NEXT_MONDAY);
    await page.getByRole("button", { name: "14:30" }).click();
    await page.getByRole("button", { name: "Confirm new time" }).click();
    await expect(page).toHaveURL(/\/my-bookings$/);
    await expect(page.getByRole("listitem", { name: "Men's haircut with Mia Torres" })).toContainText("Mon, Mar 8 · 14:30");
  });

  test("AC2: Reschedule is hidden less than 2 hours before the visit", async ({ page }) => {
    await signUp(page);
    await bookViaApi(page, { serviceId: 4, specialistId: 3, startsAt: at("2027-03-01", "10:30") });
    await page.goto("/my-bookings");
    const item = page.getByRole("listitem", { name: "Manicure with Ava Chen" });
    await expect(item).toContainText("Mon, Mar 1 · 10:30");
    await expect(item.getByRole("link", { name: "Reschedule" })).toHaveCount(0);
  });
});
