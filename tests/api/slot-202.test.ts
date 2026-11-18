import { describe, expect, it } from "vitest";
import { Client } from "../support/api";
import { SERVICE, SPECIALIST, UNKNOWN_ID, at, book, signedInClient, slotTimes, type ApiError, type Booking } from "../support/fixtures";

// All bookings in this file: Ava (Manicure, 45 min), Friday 2027-03-05 and Wednesday 2027-03-10.
// Friday: 09:00, 10:30, 12:00, 13:00, 14:00 — one time per test, no overlaps.
const DAY = "2027-03-05";
const manicureWithAva = (time: string, day = DAY) => ({ serviceId: SERVICE.manicure, specialistId: SPECIALIST.ava, startsAt: at(day, time) });

async function myBooking(client: Client, time: string, day = DAY): Promise<Booking> {
  const res = await book(client, manicureWithAva(time, day));
  if (res.status !== 201) throw new Error(`setup booking failed: ${res.status}`);
  return res.body.booking;
}

describe("SLOT-202 Cancel a booking", () => {
  it("AC1: the owner cancels a booking → 200, status cancelled", async () => {
    const { client } = await signedInClient();
    const booking = await myBooking(client, "09:00");
    const res = await client.post<{ booking: Booking }>(`/api/bookings/${booking.id}/cancel`);
    expect(res.status).toBe(200);
    expect(res.body.booking).toMatchObject({ id: booking.id, status: "cancelled" });
  });

  it("AC2: Cancelling persists the status and frees the time", async () => {
    const { client } = await signedInClient();
    const booking = await myBooking(client, "10:30");
    expect(await slotTimes(SERVICE.manicure, SPECIALIST.ava, DAY)).not.toContain("10:30");
    expect((await client.post(`/api/bookings/${booking.id}/cancel`)).status).toBe(200);
    const mine = await client.get<{ bookings: Booking[] }>("/api/me/bookings");
    expect(mine.body.bookings).toEqual([expect.objectContaining({ id: booking.id, status: "cancelled" })]);
    expect(await slotTimes(SERVICE.manicure, SPECIALIST.ava, DAY)).toContain("10:30");
    expect((await book(new Client(), manicureWithAva("10:30"))).status).toBe(201);
  });

  it("AC3: the same time can be cancelled and rebooked repeatedly", async () => {
    const { client } = await signedInClient();
    for (let round = 0; round < 2; round += 1) {
      const booking = await myBooking(client, "12:00");
      expect((await client.post(`/api/bookings/${booking.id}/cancel`)).status).toBe(200);
    }
    expect((await book(client, manicureWithAva("12:00"))).status).toBe(201);
  });

  it("AC4: cancelling twice returns 200 and keeps the booking cancelled", async () => {
    const { client } = await signedInClient();
    const booking = await myBooking(client, "13:00");
    await client.post(`/api/bookings/${booking.id}/cancel`);
    const again = await client.post<{ booking: Booking }>(`/api/bookings/${booking.id}/cancel`);
    expect(again.status).toBe(200);
    expect(again.body.booking.status).toBe("cancelled");
  });

  it("AC5: without a session → 401 unauthorized", async () => {
    const { client } = await signedInClient();
    const booking = await myBooking(client, "14:00");
    const res = await new Client().post<ApiError>(`/api/bookings/${booking.id}/cancel`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("unauthorized");
  });

  it("AC6: someone else's or an unknown booking → 404 not_found, and nothing changes", async () => {
    const owner = await signedInClient();
    const stranger = await signedInClient();
    const booking = await myBooking(owner.client, "09:00", "2027-03-10");
    for (const id of [booking.id, UNKNOWN_ID]) {
      const res = await stranger.client.post<ApiError>(`/api/bookings/${id}/cancel`);
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("not_found");
    }
    const mine = await owner.client.get<{ bookings: Booking[] }>("/api/me/bookings");
    expect(mine.body.bookings[0]?.status).toBe("active");
  });
});
