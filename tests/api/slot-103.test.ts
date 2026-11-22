import { describe, expect, it } from "vitest";
import { Client } from "../support/api";
import { SERVICE, SPECIALIST, UNKNOWN_ID, at, book, slotTimes, type ApiError } from "../support/fixtures";

// All bookings in this file: Mia, Wednesday 2027-03-03.
const DAY = "2027-03-03";
const client = new Client();

describe("SLOT-103 Create a booking", () => {
  it("AC1: books a free slot → 201 with the booking", async () => {
    const res = await book(client, {
      serviceId: SERVICE.womensHaircut,
      specialistId: SPECIALIST.mia,
      startsAt: at(DAY, "09:00"),
      clientName: "  Ana Lopez  ",
      clientEmail: "Ana.Lopez@Example.com",
    });
    expect(res.status).toBe(201);
    expect(res.body.booking).toEqual({
      id: expect.any(Number),
      serviceId: SERVICE.womensHaircut,
      serviceName: "Women's haircut",
      specialistId: SPECIALIST.mia,
      specialistName: "Mia Torres",
      clientName: "Ana Lopez",
      clientEmail: "ana.lopez@example.com",
      startsAt: "2027-03-03T09:00:00.000Z",
      endsAt: "2027-03-03T10:00:00.000Z",
      status: "active",
    });
  });

  it("AC2: a booked time disappears from availability", async () => {
    const before = await slotTimes(SERVICE.mensHaircut, SPECIALIST.mia, DAY);
    expect(before).toContain("10:30");
    const res = await book(client, { serviceId: SERVICE.mensHaircut, specialistId: SPECIALIST.mia, startsAt: at(DAY, "10:30") });
    expect(res.status).toBe(201);
    expect(await slotTimes(SERVICE.mensHaircut, SPECIALIST.mia, DAY)).not.toContain("10:30");
  });

  it("AC3: the same slot cannot be booked twice → 409 slot_taken", async () => {
    const input = { serviceId: SERVICE.mensHaircut, specialistId: SPECIALIST.mia, startsAt: at(DAY, "11:00") };
    expect((await book(client, input)).status).toBe(201);
    const second = await book(client, input);
    expect(second.status).toBe(409);
    expect(second.body.error?.code).toBe("slot_taken");
  });

  it("AC4: an overlapping booking with a different start → 409 slot_taken", async () => {
    // Hair coloring 13:00–15:00, then a haircut at 14:00
    expect((await book(client, { serviceId: SERVICE.hairColoring, specialistId: SPECIALIST.mia, startsAt: at(DAY, "13:00") })).status).toBe(201);
    const overlap = await book(client, { serviceId: SERVICE.mensHaircut, specialistId: SPECIALIST.mia, startsAt: at(DAY, "14:00") });
    expect(overlap.status).toBe(409);
    expect(overlap.body.error?.code).toBe("slot_taken");
  });

  it("AC5: simultaneous requests for one slot → exactly one 201, the rest 409", async () => {
    const input = { serviceId: SERVICE.mensHaircut, specialistId: SPECIALIST.mia, startsAt: at(DAY, "16:00") };
    const results = await Promise.all(Array.from({ length: 8 }, () => book(new Client(), input)));
    const statuses = results.map((res) => res.status).sort();
    expect(statuses).toEqual([201, 409, 409, 409, 409, 409, 409, 409]);
  });

  it("AC6: a time that is not an offered slot → 400 validation_error", async () => {
    const cases = [
      at(DAY, "09:15"), // off the 30-minute grid
      at(DAY, "17:00"), // ends after closing
      at(DAY, "07:00"), // before opening
      at("2027-02-26", "10:00"), // in the past
      "next tuesday", // not a date
    ];
    for (const startsAt of cases) {
      const res = await book(client, { serviceId: SERVICE.mensHaircut, specialistId: SPECIALIST.mia, startsAt });
      expect(res.status, startsAt).toBe(400);
      expect(res.body.error?.code).toBe("validation_error");
    }
  });

  it("AC7: specialist who does not offer the service → 400 validation_error", async () => {
    const res = await book(client, { serviceId: SERVICE.womensHaircut, specialistId: SPECIALIST.leo, startsAt: at(DAY, "12:00") });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe("validation_error");
  });

  it("AC8: invalid client details → 400 validation_error", async () => {
    const base = { serviceId: SERVICE.mensHaircut, specialistId: SPECIALIST.mia, startsAt: at(DAY, "12:00") };
    for (const details of [
      { clientName: "   " },
      { clientName: "x".repeat(81) },
      { clientEmail: "not-an-email" },
    ]) {
      const res = await book(client, { ...base, ...details });
      expect(res.status, JSON.stringify(details)).toBe(400);
      expect(res.body.error?.code).toBe("validation_error");
    }
    const missing = await client.post<ApiError>("/api/bookings", { serviceId: SERVICE.mensHaircut });
    expect(missing.status).toBe(400);
    expect(missing.body.error.code).toBe("validation_error");
  });

  it("AC9: unknown or archived service, unknown specialist → 404 not_found", async () => {
    for (const [serviceId, specialistId] of [
      [UNKNOWN_ID, SPECIALIST.mia],
      [SERVICE.keratinTreatment, SPECIALIST.mia],
      [SERVICE.mensHaircut, UNKNOWN_ID],
    ] as const) {
      const res = await book(client, { serviceId, specialistId, startsAt: at(DAY, "12:00") });
      expect(res.status, `${serviceId}/${specialistId}`).toBe(404);
      expect(res.body.error?.code).toBe("not_found");
    }
  });
});
