import { expect, type Page } from "@playwright/test";
import { uniqueEmail, type Booking, type BookingInput } from "./fixtures";

export const PASSWORD = "correct-horse-42";

/** Creates an account through the API; the browser context gets the session cookie. */
export async function signUp(page: Page, name = "Browser Client"): Promise<string> {
  const email = uniqueEmail("ui");
  const res = await page.request.post("/api/auth/sign-up/email", { data: { name, email, password: PASSWORD } });
  expect(res.status(), await res.text()).toBe(200);
  return email;
}

/** Books through the API with the browser's session (if any). */
export async function bookViaApi(page: Page, input: BookingInput): Promise<Booking> {
  const res = await page.request.post("/api/bookings", {
    data: { clientName: "Browser Client", clientEmail: uniqueEmail("ui-booking"), ...input },
  });
  expect(res.status(), await res.text()).toBe(201);
  return ((await res.json()) as { booking: Booking }).booking;
}

export function mainNav(page: Page) {
  return page.getByRole("navigation", { name: "Main" });
}
