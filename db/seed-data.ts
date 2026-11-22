/**
 * Seed data. Tests rely on these values, and docs/data-model.md → "Seed data" documents them.
 * Change both together.
 */

export type SeedService = {
  name: string;
  description: string;
  durationMin: number;
  priceCents: number;
  isActive: boolean;
};

export const SEED_SERVICES: SeedService[] = [
  { name: "Women's haircut", description: "Wash, cut and blow-dry.", durationMin: 60, priceCents: 5500, isActive: true },
  { name: "Men's haircut", description: "Clipper and scissor cut with a hot towel finish.", durationMin: 30, priceCents: 3000, isActive: true },
  { name: "Hair coloring", description: "Single-process color, toner and gloss.", durationMin: 120, priceCents: 12000, isActive: true },
  { name: "Manicure", description: "Shape, cuticle care and polish.", durationMin: 45, priceCents: 3500, isActive: true },
  { name: "Gel pedicure", description: "Soak, scrub and long-lasting gel polish.", durationMin: 60, priceCents: 4500, isActive: true },
  { name: "Brow shaping", description: "Wax, trim and tint consultation.", durationMin: 30, priceCents: 2000, isActive: true },
  { name: "Keratin treatment", description: "Smoothing treatment. No longer offered.", durationMin: 150, priceCents: 18000, isActive: false },
  { name: "Hot stone massage", description: "Full-body massage. No longer offered.", durationMin: 90, priceCents: 9000, isActive: false },
];

/** weekday: 1 = Monday … 7 = Sunday. Times are UTC. */
export type SeedHours = { weekday: number; startTime: string; endTime: string };

export type SeedSpecialist = {
  name: string;
  title: string;
  services: string[];
  hours: SeedHours[];
};

const weekdays = (days: number[], startTime: string, endTime: string): SeedHours[] =>
  days.map((weekday) => ({ weekday, startTime, endTime }));

export const SEED_SPECIALISTS: SeedSpecialist[] = [
  {
    name: "Mia Torres",
    title: "Senior stylist",
    services: ["Women's haircut", "Men's haircut", "Hair coloring", "Keratin treatment"],
    hours: weekdays([1, 2, 3, 4, 5], "09:00", "17:00"),
  },
  {
    name: "Leo Park",
    title: "Barber",
    services: ["Men's haircut"],
    hours: weekdays([2, 3, 4, 5, 6], "10:00", "18:00"),
  },
  {
    name: "Ava Chen",
    title: "Nail and brow artist",
    services: ["Manicure", "Gel pedicure", "Brow shaping", "Hot stone massage"],
    hours: [...weekdays([1, 3, 5], "09:00", "15:00"), ...weekdays([6], "10:00", "14:00")],
  },
];

/**
 * Bookings are placed on "the next <weekday> after today" (by lib/clock now(), UTC),
 * so the calendar is never empty in dev and stays deterministic when SLOTLY_NOW is set.
 */
export type SeedBooking = {
  weekday: number;
  time: string;
  specialist: string;
  service: string;
  clientName: string;
  clientEmail: string;
  status: "active" | "cancelled";
};

export const SEED_BOOKINGS: SeedBooking[] = [
  { weekday: 2, time: "10:00", specialist: "Mia Torres", service: "Women's haircut", clientName: "Emma Brown", clientEmail: "emma@example.com", status: "active" },
  { weekday: 2, time: "13:00", specialist: "Mia Torres", service: "Hair coloring", clientName: "Olivia Smith", clientEmail: "olivia@example.com", status: "active" },
  { weekday: 2, time: "15:30", specialist: "Mia Torres", service: "Men's haircut", clientName: "Noah Wilson", clientEmail: "noah@example.com", status: "cancelled" },
  { weekday: 2, time: "11:00", specialist: "Leo Park", service: "Men's haircut", clientName: "Liam Jones", clientEmail: "liam@example.com", status: "active" },
  { weekday: 3, time: "09:00", specialist: "Ava Chen", service: "Manicure", clientName: "Sophia Davis", clientEmail: "sophia@example.com", status: "active" },
];
