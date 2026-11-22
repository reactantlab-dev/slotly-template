import { sql } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Slotly domain tables. See docs/data-model.md for the full product model:
 * some columns and indexes there are added by tickets, not present in the scaffold.
 */

const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`);

export const services = sqliteTable("services", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description").notNull(),
  durationMin: integer("duration_min").notNull(),
  priceCents: integer("price_cents").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: createdAt(),
});

export const specialists = sqliteTable("specialists", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  title: text("title").notNull(),
  createdAt: createdAt(),
});

export const specialistServices = sqliteTable(
  "specialist_services",
  {
    specialistId: integer("specialist_id")
      .notNull()
      .references(() => specialists.id, { onDelete: "cascade" }),
    serviceId: integer("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.specialistId, table.serviceId] })],
);

/** Weekly schedule. weekday: 1 = Monday … 7 = Sunday (ISO 8601). Times are "HH:mm" in UTC. */
export const workingHours = sqliteTable(
  "working_hours",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    specialistId: integer("specialist_id")
      .notNull()
      .references(() => specialists.id, { onDelete: "cascade" }),
    weekday: integer("weekday").notNull(),
    startTime: text("start_time").notNull(),
    endTime: text("end_time").notNull(),
  },
  (table) => [index("working_hours_specialist_weekday_idx").on(table.specialistId, table.weekday)],
);

export const BOOKING_STATUSES = ["active", "cancelled"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const bookings = sqliteTable(
  "bookings",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    serviceId: integer("service_id")
      .notNull()
      .references(() => services.id),
    specialistId: integer("specialist_id")
      .notNull()
      .references(() => specialists.id),
    clientName: text("client_name").notNull(),
    clientEmail: text("client_email").notNull(),
    startsAt: integer("starts_at", { mode: "timestamp_ms" }).notNull(),
    endsAt: integer("ends_at", { mode: "timestamp_ms" }).notNull(),
    status: text("status", { enum: BOOKING_STATUSES }).notNull().default("active"),
    cancelledAt: integer("cancelled_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
  },
  (table) => [index("bookings_specialist_starts_idx").on(table.specialistId, table.startsAt)],
);

export type Service = typeof services.$inferSelect;
export type Specialist = typeof specialists.$inferSelect;
export type WorkingHours = typeof workingHours.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
