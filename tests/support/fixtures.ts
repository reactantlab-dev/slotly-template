/**
 * Test data that comes from the spec: seed ids and values (docs/data-model.md → Seed data),
 * the frozen clock and the booking API shapes (docs/api.md).
 */
import { Client, type ApiResponse } from "./api";

/** SLOTLY_NOW used by scripts/grade.mjs: Monday 10:00 UTC. */
export const NOW = "2027-03-01T10:00:00.000Z";

export const SERVICE = {
  womensHaircut: 1,
  mensHaircut: 2,
  hairColoring: 3,
  manicure: 4,
  gelPedicure: 5,
  browShaping: 6,
  keratinTreatment: 7, // archived
  hotStoneMassage: 8, // archived
} as const;

export const SPECIALIST = { mia: 1, leo: 2, ava: 3 } as const;

export const UNKNOWN_ID = 9999;

/**
 * Each test file books on its own specialist/day so files never affect each other.
 * Vitest does not run files in manifest order, so no file may write where another one reads.
 *   SLOT-102: Mia Tue 03-02 (seed bookings), Mia Thu 03-04, Mia Mon 03-01 — read only, nobody books there
 *   SLOT-103: API Mia Wed 03-03, UI Leo Fri 03-05
 *   SLOT-201: API Leo Thu 03-04, UI Leo Sat 03-06
 *   SLOT-202: API Ava Fri 03-05, UI Ava Sat 03-06
 *   SLOT-203: API Ava Mon 03-01 11:30 + 12:00 (→12:30), Mia Fri 03-05; UI Ava Mon 03-01 10:30, Mia Mon 03-08
 */
export function at(date: string, time: string): string {
  return new Date(`${date}T${time}:00.000Z`).toISOString();
}

export type Booking = {
  id: number;
  serviceId: number;
  serviceName: string;
  specialistId: number;
  specialistName: string;
  clientName: string;
  clientEmail: string;
  startsAt: string;
  endsAt: string;
  status: "active" | "cancelled";
};

export type Slot = { startsAt: string; endsAt: string };
export type ApiError = { error: { code: string; message: string } };

let counter = 0;
export function uniqueEmail(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}@example.com`;
}

export type BookingInput = {
  serviceId: number;
  specialistId: number;
  startsAt: string;
  clientName?: string;
  clientEmail?: string;
};

export function book(client: Client, input: BookingInput): Promise<ApiResponse<{ booking: Booking } & Partial<ApiError>>> {
  return client.post("/api/bookings", {
    clientName: "Test Client",
    clientEmail: uniqueEmail("client"),
    ...input,
  });
}

export async function slotTimes(serviceId: number, specialistId: number, date: string): Promise<string[]> {
  const res = await new Client().get<{ slots: Slot[] }>(
    `/api/availability?serviceId=${serviceId}&specialistId=${specialistId}&date=${date}`,
  );
  if (res.status !== 200) throw new Error(`availability returned ${res.status}`);
  return res.body.slots.map((slot) => slot.startsAt.slice(11, 16));
}

/** Signs up a new account through Better Auth and returns a client holding its session. */
export async function signedInClient(name = "Signed In Client"): Promise<{ client: Client; email: string }> {
  const client = new Client();
  const email = uniqueEmail("user");
  const res = await client.post("/api/auth/sign-up/email", { name, email, password: "correct-horse-42" });
  if (res.status !== 200) throw new Error(`sign-up failed with ${res.status}: ${JSON.stringify(res.body)}`);
  return { client, email };
}
