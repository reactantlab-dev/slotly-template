# Slotly

Online booking for small salons and studios: clients pick a service, a specialist and a free time, then manage their bookings.

## Quick start

Requires Node.js 24 (see `.nvmrc`). Nothing else: the database is a local SQLite file.

```bash
npm install
npm run dev     # http://localhost:3000 — creates and seeds the database on first run
npm test        # the same checks CI runs on your pull request
```

First `npm test` only: `npx playwright install chromium` (browser for UI tests).

## Where things are

- **Spec:** [`docs/`](docs) — [product brief](docs/product-brief.md), [screens](docs/screens.md), [API](docs/api.md), [data model](docs/data-model.md), [conventions](docs/conventions.md).
- **Rules for AI assistants:** [`AGENTS.md`](AGENTS.md).
- **Code:** `app/` pages and API, `components/ui/` UI kit, `lib/` logic and database.

## Workflow

One branch and one pull request per ticket (`slot-102-free-slots`). The `grade` check runs the tests for your ticket and all earlier ones; it must be green before review.
