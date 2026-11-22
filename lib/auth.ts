import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";
import * as authSchema from "@/lib/db/auth-schema";

/**
 * Public, non-secret placeholder so `npm run dev`, `npm test` and CI work with zero setup on localhost.
 * Slotly is never deployed from this repo; any real deployment must set BETTER_AUTH_SECRET.
 */
const LOCAL_ONLY_SECRET = "slotly-local-only-placeholder-not-a-secret-0000";

/**
 * Better Auth is installed and wired to the database, but no sign-in method is enabled yet.
 * Enabling email + password sign-in is ticket SLOT-201 (see docs/api.md → Auth).
 */
export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET || LOCAL_ONLY_SECRET,
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  database: drizzleAdapter(db, { provider: "sqlite", schema: authSchema }),
  // On by default in production builds. The test runner turns it off (SLOTLY_AUTH_RATE_LIMIT=off)
  // because the suites create many accounts from one IP. Keep this line.
  rateLimit: { enabled: process.env.SLOTLY_AUTH_RATE_LIMIT !== "off" },
  plugins: [nextCookies()], // must stay the last plugin
});
