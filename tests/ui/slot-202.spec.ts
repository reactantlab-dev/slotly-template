import { expect, test } from "@playwright/test";
import { at } from "../support/fixtures";
import { bookViaApi, signUp } from "../support/ui";

// All bookings in this file: Ava, Saturday 2027-03-06.
const DAY = "2027-03-06";

test.describe("SLOT-202 Cancel a booking", () => {
  test("AC1: Cancel booking marks it cancelled on the booking page and removes the action", async ({ page }) => {
    await signUp(page);
    const booking = await bookViaApi(page, { serviceId: 4, specialistId: 3, startsAt: at(DAY, "10:00") });
    await page.goto(`/my-bookings/${booking.id}`);
    await expect(page.getByText("Active", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Cancel booking" }).click();
    await expect(page.getByText("Cancelled", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel booking" })).toHaveCount(0);
  });

  test("AC2: after cancelling, the time is offered again on the booking page", async ({ page }) => {
    await signUp(page);
    const booking = await bookViaApi(page, { serviceId: 4, specialistId: 3, startsAt: at(DAY, "12:00") });
    await page.goto(`/my-bookings/${booking.id}`);
    await page.getByRole("button", { name: "Cancel booking" }).click();
    await expect(page.getByText("Cancelled", { exact: true })).toBeVisible();
    await page.goto("/book/4");
    await page.getByRole("radio", { name: "Ava Chen" }).check();
    await page.getByLabel("Date").fill(DAY);
    await expect(page.getByRole("button", { name: "12:00" })).toBeVisible();
  });

  test("AC3: Cancel is reachable from My bookings", async ({ page }) => {
    await signUp(page);
    const booking = await bookViaApi(page, { serviceId: 4, specialistId: 3, startsAt: at(DAY, "13:00") });
    await page.goto("/my-bookings");
    const item = page.getByRole("listitem", { name: "Manicure with Ava Chen" });
    const cancelLink = item.getByRole("link", { name: "Cancel booking" });
    await expect(cancelLink).toHaveAttribute("href", `/my-bookings/${booking.id}`);
    await cancelLink.click();
    await expect(page).toHaveURL(`/my-bookings/${booking.id}`);
    await expect(page.getByRole("button", { name: "Cancel booking" })).toBeVisible();
  });
});
