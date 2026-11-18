import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { services } from "@/lib/db/schema";

export type ServiceDto = {
  id: number;
  name: string;
  description: string;
  durationMin: number;
  priceCents: number;
};

/** Services a client can book, for the catalog page and GET /api/services. */
export function listServices(): ServiceDto[] {
  return db
    .select({
      id: services.id,
      name: services.name,
      description: services.description,
      durationMin: services.durationMin,
      priceCents: services.priceCents,
    })
    .from(services)
    .orderBy(asc(services.name))
    .all();
}
