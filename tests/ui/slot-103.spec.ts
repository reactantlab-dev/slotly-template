import { expect, test } from "@playwright/test";
import { at } from "../support/fixtures";
import { bookViaApi } from "../support/ui";

// All bookings in this file: Leo, Friday 2027-03-05.
const DAY = "2027-03-05";

async function chooseLeoOn(page: import("@playwright/test").Page, time: string) {
  await page.goto("/book/2");
  await page.getByRole("radio", { name: "Leo Park" }).check();
  await page.getByLabel("Date").fill(DAY);
  await page.getByRole("button", { name: time }).click();
}

test.describe("SLOT-103 Create a booking", () => {
  test("AC1: Confirm is disabled until a time is selected", async ({ page }) => {
    await page.goto("/book/2");
    await expect(page.getByRole("button", { name: "Confirm booking" })).toBeDisabled();
  });

  test("AC2: booking a time leads to the confirmation page", async ({ page }) => {
    await chooseLeoOn(page, "10:00");
    await page.getByLabel("Your name").fill("Ana Lopez");
    await page.getByLabel("Email").fill("ana.ui@example.com");
    await page.getByRole("button", { name: "Confirm booking" }).click();
    await expect(page).toHaveURL(/\/bookings\/\d+$/);
    await expect(page.getByRole("heading", { level: 1, name: "You're booked" })).toBeVisible();
    await expect(page.getByText("Men's haircut with Leo Park")).toBeVisible();
    await expect(page.getByText("Fri, Mar 5 · 10:00")).toBeVisible();
    await expect(page.getByText("ana.ui@example.com")).toHaveCount(0);
  });

  test("AC3: a time taken meanwhile shows a message and disappears from the list", async ({ page }) => {
    await chooseLeoOn(page, "11:00");
    await page.getByLabel("Your name").fill("Late Client");
    await page.getByLabel("Email").fill("late.ui@example.com");
    await bookViaApi(page, { serviceId: 2, specialistId: 2, startsAt: at(DAY, "11:00") });
    await page.getByRole("button", { name: "Confirm booking" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "This time was just taken. Please pick another one." })).toBeVisible();
    await expect(page.getByRole("button", { name: "11:00" })).toHaveCount(0);
  });

  test("AC4: an invalid email does not create a booking", async ({ page }) => {
    await chooseLeoOn(page, "12:00");
    await page.getByLabel("Your name").fill("Ana Lopez");
    await page.getByLabel("Email").fill("not-an-email");
    await page.getByRole("button", { name: "Confirm booking" }).click();
    await expect(page).toHaveURL(/\/book\/2/);
    const res = await page.request.get(`/api/availability?serviceId=2&specialistId=2&date=${DAY}`);
    const { slots } = (await res.json()) as { slots: Array<{ startsAt: string }> };
    expect(slots.map((slot) => slot.startsAt)).toContain(at(DAY, "12:00"));
  });
});
