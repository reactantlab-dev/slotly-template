import { describe, expect, it } from "vitest";
import { Client } from "../support/api";
import { SERVICE, SPECIALIST, UNKNOWN_ID, at, book, signedInClient, slotTimes, type ApiError, type Booking } from "../support/fixtures";

// now = Monday 2027-03-01 10:00. Bookings in this file: Ava today (Brow shaping 11:30, 12:00 → 12:30), Mia Friday 2027-03-05.
const TODAY = "2027-03-01";
const DAY = "2027-03-05";

async function myBooking(
  client: Client,
  serviceId: number,
  date: string,
  time: string,
  specialistId: number = SPECIALIST.mia,
): Promise<Booking> {
  const res = await book(client, { serviceId, specialistId, startsAt: at(date, time) });
  if (res.status !== 201) throw new Error(`setup booking failed: ${res.status}`);
  return res.body.booking;
}

const reschedule = (client: Client, id: number, startsAt: string) =>
  client.patch<{ booking: Booking } & Partial<ApiError>>(`/api/bookings/${id}`, { startsAt });

describe("SLOT-203 Reschedule a booking", () => {
  it("AC1: moves the booking to a free time; the old time is freed, the new one taken", async () => {
    const { client } = await signedInClient();
    const booking = await myBooking(client, SERVICE.mensHaircut, DAY, "09:00");
    const res = await reschedule(client, booking.id, at(DAY, "10:00"));
    expect(res.status).toBe(200);
    expect(res.body.booking).toMatchObject({
      id: booking.id,
      serviceId: SERVICE.mensHaircut,
      specialistId: SPECIALIST.mia,
      startsAt: "2027-03-05T10:00:00.000Z",
      endsAt: "2027-03-05T10:30:00.000Z",
      status: "active",
    });
    const free = await slotTimes(SERVICE.mensHaircut, SPECIALIST.mia, DAY);
    expect(free).toContain("09:00");
    expect(free).not.toContain("10:00");
  });

  it("AC2: the booking's own current time does not block the move", async () => {
    const { client } = await signedInClient();
    const booking = await myBooking(client, SERVICE.womensHaircut, DAY, "11:00"); // 11:00–12:00
    const res = await reschedule(client, booking.id, at(DAY, "11:30")); // overlaps only itself
    expect(res.status).toBe(200);
    expect(res.body.booking.startsAt).toBe("2027-03-05T11:30:00.000Z");
  });

  it("AC3: a time taken by another active booking → 409 slot_taken", async () => {
    const { client } = await signedInClient();
    expect((await book(new Client(), { serviceId: SERVICE.mensHaircut, specialistId: SPECIALIST.mia, startsAt: at(DAY, "14:00") })).status).toBe(201);
    const booking = await myBooking(client, SERVICE.mensHaircut, DAY, "15:00");
    const res = await reschedule(client, booking.id, at(DAY, "14:00"));
    expect(res.status).toBe(409);
    expect(res.body.error?.code).toBe("slot_taken");
  });

  it("AC4: a time that is not an offered slot → 400 validation_error", async () => {
    const { client } = await signedInClient();
    const booking = await myBooking(client, SERVICE.mensHaircut, DAY, "13:00");
    for (const startsAt of [at(DAY, "13:15"), at(DAY, "17:00"), at("2027-02-26", "10:00"), "soon"]) {
      const res = await reschedule(client, booking.id, startsAt);
      expect(res.status, startsAt).toBe(400);
      expect(res.body.error?.code).toBe("validation_error");
    }
  });

  it("AC5: less than 2 hours before the visit → 422 too_late (checked before the new time)", async () => {
    const { client } = await signedInClient();
    const booking = await myBooking(client, SERVICE.browShaping, TODAY, "11:30", SPECIALIST.ava); // starts in 1 h 30 min
    for (const startsAt of [at(DAY, "16:00"), at(DAY, "13:15")]) {
      const res = await reschedule(client, booking.id, startsAt);
      expect(res.status, startsAt).toBe(422);
      expect(res.body.error?.code).toBe("too_late");
    }
  });

  it("AC6: exactly 2 hours before the visit is still allowed", async () => {
    const { client } = await signedInClient();
    const booking = await myBooking(client, SERVICE.browShaping, TODAY, "12:00", SPECIALIST.ava); // starts in exactly 2 h
    const res = await reschedule(client, booking.id, at(TODAY, "12:30"));
    expect(res.status).toBe(200);
    expect(res.body.booking.startsAt).toBe("2027-03-01T12:30:00.000Z");
  });

  it("AC7: a cancelled booking cannot be rescheduled → 400 validation_error", async () => {
    const { client } = await signedInClient();
    const booking = await myBooking(client, SERVICE.mensHaircut, DAY, "16:30");
    expect((await client.post(`/api/bookings/${booking.id}/cancel`)).status).toBe(200);
    const res = await reschedule(client, booking.id, at(DAY, "15:30"));
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe("validation_error");
  });

  it("AC8: without a session → 401; someone else's or unknown booking → 404", async () => {
    const owner = await signedInClient();
    const stranger = await signedInClient();
    const booking = await myBooking(owner.client, SERVICE.mensHaircut, DAY, "16:00");
    const anonymous = await reschedule(new Client(), booking.id, at(DAY, "15:30"));
    expect(anonymous.status).toBe(401);
    expect(anonymous.body.error?.code).toBe("unauthorized");
    for (const id of [booking.id, UNKNOWN_ID]) {
      const res = await reschedule(stranger.client, id, at(DAY, "15:30"));
      expect(res.status).toBe(404);
      expect(res.body.error?.code).toBe("not_found");
    }
    const mine = await owner.client.get<{ bookings: Booking[] }>("/api/me/bookings");
    expect(mine.body.bookings[0]?.startsAt).toBe("2027-03-05T16:00:00.000Z");
  });
});
