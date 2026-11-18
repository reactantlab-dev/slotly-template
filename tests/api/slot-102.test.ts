import { describe, expect, it } from "vitest";
import { api } from "../support/api";
import { SERVICE, SPECIALIST, UNKNOWN_ID, slotTimes, type ApiError, type Slot } from "../support/fixtures";

type Specialist = { id: number; name: string; title: string };

describe("SLOT-102 Free time — specialists", () => {
  it("AC1: lists specialists who offer the service, sorted by name", async () => {
    const res = await api<{ specialists: Specialist[] }>(`/api/services/${SERVICE.mensHaircut}/specialists`);
    expect(res.status).toBe(200);
    expect(res.body.specialists).toEqual([
      { id: SPECIALIST.leo, name: "Leo Park", title: "Barber" },
      { id: SPECIALIST.mia, name: "Mia Torres", title: "Senior stylist" },
    ]);
  });

  it("AC2: unknown or archived service → 404 not_found", async () => {
    for (const id of [UNKNOWN_ID, SERVICE.keratinTreatment]) {
      const res = await api<ApiError>(`/api/services/${id}/specialists`);
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("not_found");
    }
  });

  it("AC3: malformed service id → 400 validation_error", async () => {
    const res = await api<ApiError>("/api/services/abc/specialists");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation_error");
  });
});

describe("SLOT-102 Free time — availability", () => {
  const url = (serviceId: number, specialistId: number, date: string) =>
    `/api/availability?serviceId=${serviceId}&specialistId=${specialistId}&date=${date}`;

  it("AC4: returns the date and slots with start and end in UTC ISO format", async () => {
    const res = await api<{ date: string; slots: Slot[] }>(url(SERVICE.womensHaircut, SPECIALIST.mia, "2027-03-02"));
    expect(res.status).toBe(200);
    expect(res.body.date).toBe("2027-03-02");
    expect(res.body.slots[0]).toEqual({ startsAt: "2027-03-02T09:00:00.000Z", endsAt: "2027-03-02T10:00:00.000Z" });
  });

  it("AC5: 30-minute steps within working hours; the whole service fits before closing", async () => {
    // Mia, Thursday 09:00–17:00, no bookings; Hair coloring is 120 min → last start 15:00
    expect(await slotTimes(SERVICE.hairColoring, SPECIALIST.mia, "2027-03-04")).toEqual([
      "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00",
      "12:30", "13:00", "13:30", "14:00", "14:30", "15:00",
    ]);
  });

  it("AC6: times overlapping active bookings are excluded; cancelled bookings do not block", async () => {
    // Mia, Tuesday: active 10:00–11:00 and 13:00–15:00, cancelled 15:30–16:00
    expect(await slotTimes(SERVICE.womensHaircut, SPECIALIST.mia, "2027-03-02")).toEqual([
      "09:00", "11:00", "11:30", "12:00", "15:00", "15:30", "16:00",
    ]);
  });

  it("AC7: past times are excluded (today only after now, past dates empty)", async () => {
    // now = Monday 2027-03-01 10:00
    expect(await slotTimes(SERVICE.mensHaircut, SPECIALIST.mia, "2027-03-01")).toEqual([
      "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
      "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
    ]);
    expect(await slotTimes(SERVICE.mensHaircut, SPECIALIST.mia, "2027-02-26")).toEqual([]);
  });

  it("AC8: a day without working hours has no slots", async () => {
    expect(await slotTimes(SERVICE.mensHaircut, SPECIALIST.mia, "2027-03-07")).toEqual([]); // Sunday
  });

  it("AC9: missing or malformed parameters → 400 validation_error", async () => {
    for (const query of [
      `serviceId=${SERVICE.mensHaircut}&specialistId=${SPECIALIST.mia}`,
      `serviceId=${SERVICE.mensHaircut}&specialistId=${SPECIALIST.mia}&date=2027-3-2`,
      `serviceId=abc&specialistId=${SPECIALIST.mia}&date=2027-03-02`,
    ]) {
      const res = await api<ApiError>(`/api/availability?${query}`);
      expect(res.status, query).toBe(400);
      expect(res.body.error.code).toBe("validation_error");
    }
  });

  it("AC10: unknown/archived service, unknown specialist, or service not offered → 404 not_found", async () => {
    for (const [serviceId, specialistId] of [
      [UNKNOWN_ID, SPECIALIST.mia],
      [SERVICE.keratinTreatment, SPECIALIST.mia],
      [SERVICE.mensHaircut, UNKNOWN_ID],
      [SERVICE.womensHaircut, SPECIALIST.leo],
    ] as const) {
      const res = await api<ApiError>(url(serviceId, specialistId, "2027-03-02"));
      expect(res.status, `${serviceId}/${specialistId}`).toBe(404);
      expect(res.body.error.code).toBe("not_found");
    }
  });
});
