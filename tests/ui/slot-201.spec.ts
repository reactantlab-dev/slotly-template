import { expect, test } from "@playwright/test";
import { at, uniqueEmail } from "../support/fixtures";
import { PASSWORD, bookViaApi, mainNav, signUp } from "../support/ui";

// All bookings in this file: Leo, Saturday 2027-03-06.
const DAY = "2027-03-06";

test.describe("SLOT-201 Sign in and My bookings", () => {
  test("AC1: My bookings redirects to sign in when signed out", async ({ page }) => {
    await page.goto("/my-bookings");
    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(page.getByRole("heading", { level: 1, name: "Sign in" })).toBeVisible();
    await expect(mainNav(page).getByRole("link", { name: "Sign in" })).toBeVisible();
  });

  test("AC2: creating an account signs in and opens My bookings", async ({ page }) => {
    await page.goto("/sign-up");
    await page.getByLabel("Name").fill("Ana Lopez");
    await page.getByLabel("Email").fill(uniqueEmail("signup-ui"));
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/my-bookings$/);
    await expect(page.getByRole("heading", { level: 1, name: "My bookings" })).toBeVisible();
    await expect(page.getByText("No bookings yet")).toBeVisible();
    await expect(mainNav(page).getByRole("link", { name: "My bookings" })).toBeVisible();
    await expect(mainNav(page).getByRole("button", { name: "Sign out" })).toBeVisible();
  });

  test("AC3: a short password shows a field error", async ({ page }) => {
    await page.goto("/sign-up");
    await page.getByLabel("Name").fill("Ana Lopez");
    await page.getByLabel("Email").fill(uniqueEmail("short-ui"));
    await page.getByLabel("Password").fill("1234567");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Use at least 8 characters")).toBeVisible();
    await expect(page).toHaveURL(/\/sign-up$/);
  });

  test("AC4: an email that is already registered shows a message", async ({ page, browser }) => {
    const email = await signUp(page);
    const fresh = await browser.newPage();
    await fresh.goto("/sign-up");
    await fresh.getByLabel("Name").fill("Someone Else");
    await fresh.getByLabel("Email").fill(email);
    await fresh.getByLabel("Password").fill(PASSWORD);
    await fresh.getByRole("button", { name: "Create account" }).click();
    await expect(fresh.getByRole("alert").filter({ hasText: "An account with this email already exists" })).toBeVisible();
    await fresh.close();
  });

  test("AC5: wrong credentials show a message; right ones sign in", async ({ page, browser }) => {
    const email = await signUp(page);
    const fresh = await browser.newPage();
    await fresh.goto("/sign-in");
    await fresh.getByLabel("Email").fill(email);
    await fresh.getByLabel("Password").fill("wrong-password");
    await fresh.getByRole("button", { name: "Sign in" }).click();
    await expect(fresh.getByRole("alert").filter({ hasText: "Wrong email or password" })).toBeVisible();
    await fresh.getByLabel("Password").fill(PASSWORD);
    await fresh.getByRole("button", { name: "Sign in" }).click();
    await expect(fresh).toHaveURL(/\/my-bookings$/);
    await fresh.close();
  });

  test("AC6: My bookings lists the client's bookings, earliest first", async ({ page }) => {
    await signUp(page);
    await bookViaApi(page, { serviceId: 2, specialistId: 2, startsAt: at(DAY, "13:00") });
    await bookViaApi(page, { serviceId: 2, specialistId: 2, startsAt: at(DAY, "10:00") });
    await page.goto("/my-bookings");
    const items = page.getByRole("list", { name: "Bookings" }).getByRole("listitem", { name: "Men's haircut with Leo Park" });
    await expect(items).toHaveCount(2);
    await expect(items.nth(0)).toContainText("Sat, Mar 6 · 10:00");
    await expect(items.nth(1)).toContainText("Sat, Mar 6 · 13:00");
    await expect(items.nth(0)).toContainText("Active");
  });

  test("AC7: the booking form is prefilled for a signed-in client", async ({ page }) => {
    const email = await signUp(page, "Prefilled Client");
    await page.goto("/book/2");
    await expect(page.getByLabel("Your name")).toHaveValue("Prefilled Client");
    await expect(page.getByLabel("Email")).toHaveValue(email);
  });

  test("AC8: Sign out returns to Services and shows Sign in", async ({ page }) => {
    await signUp(page);
    await page.goto("/my-bookings");
    await mainNav(page).getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/services$/);
    await expect(mainNav(page).getByRole("link", { name: "Sign in" })).toBeVisible();
  });
});
