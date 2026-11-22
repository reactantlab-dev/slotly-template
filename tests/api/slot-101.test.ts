import { describe, expect, it } from "vitest";
import { api } from "../support/api";

type Service = { id: number; name: string; description: string; durationMin: number; priceCents: number };

describe("SLOT-101 Services page — API", () => {
  it("AC1: GET /api/services returns only active services", async () => {
    const res = await api<{ services: Service[] }>("/api/services");
    expect(res.status).toBe(200);
    const names = res.body.services.map((service) => service.name);
    expect(names).not.toContain("Keratin treatment");
    expect(names).not.toContain("Hot stone massage");
    expect(names).toHaveLength(6);
  });

  it("AC2: services are sorted by name A→Z", async () => {
    const res = await api<{ services: Service[] }>("/api/services");
    const names = res.body.services.map((service) => service.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "en")));
  });

  it("AC3: each service has duration and price in cents", async () => {
    const res = await api<{ services: Service[] }>("/api/services");
    expect(res.body.services.find((service) => service.name === "Women's haircut")).toMatchObject({
      durationMin: 60,
      priceCents: 5500,
    });
  });
});
