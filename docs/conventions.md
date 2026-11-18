# Conventions

How we build Slotly. Short on purpose; when in doubt, match the code around you.

## Run it

```bash
npm install
npm run dev        # creates and seeds data/slotly.db on first run, then http://localhost:3000
npm test           # fresh test database, production build, API + UI tests
```

Requires Node.js 24 (`.nvmrc`). Nothing else to install: the database is a local SQLite file.

| Command | What it does |
| --- | --- |
| `npm run db:reset` | Delete the local database and recreate it from migrations and seed |
| `npm run db:generate -- --name=<what>` | Create a migration from changes in `lib/db/schema.ts` |
| `npm run db:migrate` | Apply pending migrations to the local database |
| `npm run db:studio` | Browse the database in Drizzle Studio |
| `npm run typecheck` | TypeScript, strict |
| `npm test -- --ticket SLOT-102` | Tests for SLOT-102 and every earlier ticket, as CI runs them |

## Project layout

```
app/                    pages and API route handlers (Next.js App Router)
  api/…/route.ts        one file per endpoint; thin: parse input → call lib → return JSON
components/ui/          shared UI kit — use it before writing new primitives
components/<feature>/   components for one feature (e.g. components/booking/)
lib/                    business logic and data access, no React
  db/schema.ts          Drizzle schema (Slotly tables)
  db/auth-schema.ts     Better Auth tables (generated, do not edit)
  auth.ts               Better Auth instance
  clock.ts              now()
db/seed-data.ts         seed values; tests depend on them
drizzle/                generated SQL migrations (commit them, never edit applied ones)
docs/                   this spec
tests/                  grading tests (read-only for tickets)
```

## Code

- TypeScript strict. No `any`, no `@ts-ignore`.
- Server Components by default; add `"use client"` only for interactivity (selecting a slot, submitting a form).
- Database access only from server code in `lib/`. Pages and route handlers call `lib` functions.
- Validate every request body and query with `zod` at the route handler. Respond with the [error format](api.md#errors) via `jsonError()` from `lib/http.ts`.
- Pages that read the database call `await connection()` (from `next/server`) so they render per request.
- Styling: Tailwind utilities and the tokens in `app/globals.css` (`bg-surface`, `text-ink`, `text-accent` …). No raw hex colors.
- Accessibility: every input has a `<label>`, buttons have text, one `<h1>` per page. Tests find elements by role and label, so this is not optional.

## Time

- Everything is UTC: storage, API, working hours and UI. Format in the UI with `timeZone: "UTC"`.
- Get the current time only from `now()` in `lib/clock.ts`. Never `new Date()` or `Date.now()` for "now" in app code. Tests freeze time with `SLOTLY_NOW`.

## Database

- Change the schema in `lib/db/schema.ts`, then `npm run db:generate -- --name=<what>`, review the SQL in `drizzle/`, then `npm run db:migrate`.
- Commit the migration with the code that needs it. CI builds the database from migrations, so a schema change without a migration fails.
- Rules that must hold under concurrency (no double booking) belong in the database: constraints and unique indexes, not only `if` checks.

## Tests

- Tests check behavior from outside: HTTP requests to the API and a real browser on the UI. They never import app code, so any internal structure that follows this spec passes.
- Tests for every ticket are in the repo from day one, as part of the spec: `tests/api/slot-NNN.test.ts`, `tests/ui/slot-NNN.spec.ts`, listed in `tests/manifest.json`. CI runs the current ticket's suite plus all earlier ones; later tickets' tests are never run, so they cannot fail your PR. `npm test` on a branch without a ticket number runs only the scaffold suite.
- **Do not edit `tests/`, the test configs, `scripts/grade.mjs` or `.github/`.** CI restores them from `main`, and a PR that changes them is blocked.
- Every run starts from a fresh database with the seed data, `SLOTLY_NOW=2027-03-01T10:00:00.000Z` and `SLOTLY_AUTH_RATE_LIMIT=off` (the suites sign up many accounts; keep the `rateLimit` line in `lib/auth.ts`).

## Git

- Branch per ticket: `slot-<number>-<short-name>`, e.g. `slot-102-free-slots`. CI reads the ticket number from the branch name, or from the PR title if the branch has none.
- Commits: `feat: …`, `fix: …`, `refactor: …`, `test: …`, `chore: …`, `docs: …`.
- One PR per ticket into `main`. Keep the diff to what the ticket needs.
- The `grade` check must be green and a reviewer must approve before merge.

## Security

- No secrets in the repo. `.env*` files are ignored, except `.env.example`.
- Never return another client's bookings. A booking that is not yours is `404`, not `403`.
- Error responses never include stack traces or SQL.

## Dependencies

- Do not add, remove or change dependencies: everything the tickets need is already installed. A PR that changes `package.json` or `package-lock.json` is not accepted.
- Versions are pinned exactly. Do not add `^`/`~` or upgrade as part of a ticket.
- `npm audit` reports moderate issues in esbuild, pulled in by `drizzle-kit`. They affect only the local development tooling (the esbuild dev server), not the app that runs or ships. Do not run `npm audit fix --force`: it would change pinned versions.

## Copy

All UI text, API messages, code, comments and commits are in English. UI copy in [screens](screens.md) is exact.
