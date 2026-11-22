import { describe, expect, it } from "vitest";
import { Client } from "../support/api";
import { SERVICE, SPECIALIST, at, book, signedInClient, uniqueEmail, type ApiError, type Booking } from "../support/fixtures";

// All bookings in this file: Leo, Thursday 2027-03-04.
const DAY = "2027-03-04";
const mensHaircutWithLeo = (time: string) => ({ serviceId: SERVICE.mensHaircut, specialistId: SPECIALIST.leo, startsAt: at(DAY, time) });

describe("SLOT-201 Sign in and My bookings", () => {
  it("AC1: sign up with email and password starts a session", async () => {
    const { client, email } = await signedInClient("Ana Lopez");
    const session = await client.get<{ user: { email: string; name: string } } | null>("/api/auth/get-session");
    expect(session.status).toBe(200);
    expect(session.body?.user).toMatchObject({ email, name: "Ana Lopez" });
  });

  it("AC2: password shorter than 8 characters is rejected", async () => {
    const res = await new Client().post("/api/auth/sign-up/email", { name: "Short", email: uniqueEmail("short"), password: "1234567" });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  it("AC3: sign in with the right password works, the wrong one does not", async () => {
    const { email } = await signedInClient();
    const wrong = await new Client().post("/api/auth/sign-in/email", { email, password: "wrong-password" });
    expect(wrong.status).toBeGreaterThanOrEqual(400);
    expect(wrong.status).toBeLessThan(500);
    const right = new Client();
    expect((await right.post("/api/auth/sign-in/email", { email, password: "correct-horse-42" })).status).toBe(200);
    expect((await right.get("/api/me/bookings")).status).toBe(200);
  });

  it("AC4: GET /api/me/bookings without a session → 401 unauthorized", async () => {
    const res = await new Client().get<ApiError>("/api/me/bookings");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("unauthorized");
  });

  it("AC5: a new account has no bookings", async () => {
    const { client } = await signedInClient();
    const res = await client.get<{ bookings: Booking[] }>("/api/me/bookings");
    expect(res.status).toBe(200);
    expect(res.body.bookings).toEqual([]);
  });

  it("AC6: bookings made while signed in are listed, earliest first", async () => {
    const { client } = await signedInClient();
    const late = await book(client, mensHaircutWithLeo("15:00"));
    const early = await book(client, mensHaircutWithLeo("10:00"));
    expect([late.status, early.status]).toEqual([201, 201]);
    const res = await client.get<{ bookings: Booking[] }>("/api/me/bookings");
    expect(res.body.bookings.map((booking) => booking.id)).toEqual([early.body.booking.id, late.body.booking.id]);
    expect(res.body.bookings[0]).toMatchObject({ serviceName: "Men's haircut", specialistName: "Leo Park", status: "active" });
  });

  it("AC7: only the client's own bookings are listed — not other accounts', not signed-out ones with the same email", async () => {
    const me = await signedInClient();
    const other = await signedInClient();
    expect((await book(other.client, mensHaircutWithLeo("11:00"))).status).toBe(201);
    expect((await book(new Client(), { ...mensHaircutWithLeo("11:30"), clientEmail: me.email })).status).toBe(201);
    const res = await me.client.get<{ bookings: Booking[] }>("/api/me/bookings");
    expect(res.body.bookings).toEqual([]);
  });

  it("AC8: signing out ends the session", async () => {
    const { client } = await signedInClient();
    expect((await client.post("/api/auth/sign-out", {})).status).toBe(200);
    expect((await client.get("/api/me/bookings")).status).toBe(401);
  });
});
