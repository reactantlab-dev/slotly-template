import type { Metadata } from "next";
import { connection } from "next/server";
import { Badge, ButtonLink, EmptyState, PageHeader, Surface } from "@/components/ui";
import { formatDuration, formatPrice } from "@/lib/format";
import { listServices } from "@/lib/services";

export const metadata: Metadata = { title: "Services" };

export default async function ServicesPage() {
  await connection(); // render per request: the catalog lives in the database
  const services = listServices();

  return (
    <>
      <PageHeader
        eyebrow="Book a visit"
        title="Services"
        description="Pick a service, then choose a specialist and a time that suits you."
      />
      {services.length === 0 ? (
        <EmptyState title="No services yet">Check back soon.</EmptyState>
      ) : (
        <ul aria-label="Services" className="flex flex-col gap-4">
          {services.map((service) => (
            <Surface
              as="li"
              key={service.id}
              aria-label={service.name}
              className="group flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <h2 className="font-display text-2xl font-semibold tracking-tight">{service.name}</h2>
                <p className="mt-1 text-ink-muted">{service.description}</p>
                <div className="mt-3 flex items-center gap-2">
                  <Badge>{formatDuration(service.durationMin)}</Badge>
                  <span className="text-lg font-semibold text-accent-strong">{formatPrice(service.priceCents)}</span>
                </div>
              </div>
              <ButtonLink href={`/book/${service.id}`} aria-label={`Book ${service.name}`} className="shrink-0">
                Book
              </ButtonLink>
            </Surface>
          ))}
        </ul>
      )}
    </>
  );
}
