import type { Db } from "@/lib/db";
import { bookings, services, specialistServices, specialists, workingHours } from "@/lib/db/schema";
import { SEED_BOOKINGS, SEED_SERVICES, SEED_SPECIALISTS } from "./seed-data";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Next date (strictly after `today`) that falls on ISO `weekday`, at `time` UTC. */
export function nextWeekdayAt(today: Date, weekday: number, time: string): Date {
  const isoToday = today.getUTCDay() === 0 ? 7 : today.getUTCDay();
  const daysAhead = ((weekday - isoToday + 7) % 7) || 7;
  const [hours, minutes] = time.split(":").map(Number);
  const midnight = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return new Date(midnight + daysAhead * DAY_MS + ((hours ?? 0) * 60 + (minutes ?? 0)) * 60_000);
}

function requireId(ids: Map<string, number>, name: string): number {
  const id = ids.get(name);
  if (id === undefined) throw new Error(`Seed references unknown name: ${name}`);
  return id;
}

export function seed(db: Db, today: Date): void {
  db.transaction((tx) => {
    const serviceIds = new Map<string, number>();
    const durations = new Map<string, number>();
    for (const service of SEED_SERVICES) {
      const row = tx.insert(services).values(service).returning({ id: services.id }).get();
      serviceIds.set(service.name, row.id);
      durations.set(service.name, service.durationMin);
    }

    const specialistIds = new Map<string, number>();
    for (const specialist of SEED_SPECIALISTS) {
      const row = tx
        .insert(specialists)
        .values({ name: specialist.name, title: specialist.title })
        .returning({ id: specialists.id })
        .get();
      specialistIds.set(specialist.name, row.id);
      tx.insert(specialistServices)
        .values(specialist.services.map((name) => ({ specialistId: row.id, serviceId: requireId(serviceIds, name) })))
        .run();
      tx.insert(workingHours)
        .values(specialist.hours.map((hours) => ({ specialistId: row.id, ...hours })))
        .run();
    }

    for (const booking of SEED_BOOKINGS) {
      const startsAt = nextWeekdayAt(today, booking.weekday, booking.time);
      const durationMin = durations.get(booking.service) ?? 0;
      tx.insert(bookings)
        .values({
          serviceId: requireId(serviceIds, booking.service),
          specialistId: requireId(specialistIds, booking.specialist),
          clientName: booking.clientName,
          clientEmail: booking.clientEmail,
          startsAt,
          endsAt: new Date(startsAt.getTime() + durationMin * 60_000),
          status: booking.status,
        })
        .run();
    }
  });
}
