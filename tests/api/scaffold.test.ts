import { describe, expect, it } from "vitest";
import { api } from "../support/api";

// Scaffold suite: the project boots, the database is seeded and the API shape follows docs/api.md.
describe("scaffold", () => {
  it("AC1: health check responds", async () => {
    const res = await api("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("AC2: GET /api/services returns the seeded catalog in the documented shape", async () => {
    const res = await api<{ services: Array<Record<string, unknown>> }>("/api/services");
    expect(res.status).toBe(200);
    expect(res.body.services.length).toBeGreaterThan(0);
    for (const service of res.body.services) {
      expect(service).toEqual({
        id: expect.any(Number),
        name: expect.any(String),
        description: expect.any(String),
        durationMin: expect.any(Number),
        priceCents: expect.any(Number),
      });
    }
  });

  it("AC3: unknown API routes return a JSON 404 error", async () => {
    const res = await api("/api/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: "not_found", message: expect.any(String) } });
  });

  it("AC4: auth library is mounted under /api/auth", async () => {
    const res = await api("/api/auth/ok");
    expect(res.status).toBe(200);
  });
});
