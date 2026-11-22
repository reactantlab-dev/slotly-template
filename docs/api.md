# API

JSON over HTTP, served by Next.js route handlers under `/api`. Tests call these endpoints directly, so status codes, field names and error codes are the contract.

## General rules

- Request and response bodies are JSON. Field names are `camelCase`.
- Times are ISO 8601 strings in UTC with milliseconds: `"2027-03-02T10:00:00.000Z"`. Dates are `"YYYY-MM-DD"`.
- Money is an integer number of cents: `priceCents: 5500`.
- Lists are wrapped in an object: `{ "services": [...] }`, never a bare array.
- "Now" is the server clock, which tests freeze with `SLOTLY_NOW` (see [conventions](conventions.md#time)).

## Errors

Every error has the same body:

```json
{ "error": { "code": "slot_taken", "message": "This time is no longer available" } }
```

| Status | `code` | When |
| --- | --- | --- |
| 400 | `validation_error` | Missing or malformed input, or a time that is not an offered slot |
| 401 | `unauthorized` | Endpoint needs a signed-in client |
| 404 | `not_found` | Unknown route or resource, **or a booking that belongs to someone else** (never reveal it exists) |
| 409 | `slot_taken` | The time overlaps an active booking of the specialist |
| 422 | `too_late` | Change requested less than 2 hours before the visit |
| 500 | `internal_error` | Anything unexpected. The message never contains stack traces or SQL |

`message` is human-readable English; tests check `code`, not `message`.

## Types

```ts
type Service = { id: number; name: string; description: string; durationMin: number; priceCents: number };
type Specialist = { id: number; name: string; title: string };
type Slot = { startsAt: string; endsAt: string };
type Booking = {
  id: number;
  serviceId: number;
  serviceName: string;
  specialistId: number;
  specialistName: string;
  clientName: string;
  clientEmail: string;
  startsAt: string;
  endsAt: string;
  status: "active" | "cancelled";
};
```

## Endpoints

| Method and path | Auth | Ticket |
| --- | --- | --- |
| `GET /api/health` | — | scaffold |
| `GET /api/services` | — | scaffold, fixed in SLOT-101 |
| `GET /api/services/{id}/specialists` | — | SLOT-102 |
| `GET /api/availability` | — | SLOT-102 |
| `POST /api/bookings` | optional | SLOT-103 (links to account from SLOT-201) |
| `/api/auth/*` | — | mounted in the scaffold, email + password in SLOT-201 |
| `GET /api/me/bookings` | required | SLOT-201 |
| `POST /api/bookings/{id}/cancel` | required | SLOT-202 |
| `PATCH /api/bookings/{id}` | required | SLOT-203 |

### `GET /api/health`

`200 { "status": "ok" }`. Used by the test runner to wait for the server.

### `GET /api/services`

`200 { "services": Service[] }` — active services only, sorted by `name` A→Z.

### `GET /api/services/{id}/specialists`

`200 { "specialists": Specialist[] }` — specialists who offer the service, sorted by `name` A→Z.

`404 not_found` if the service does not exist or is archived. `400 validation_error` if `id` is not a positive integer.

### `GET /api/availability`

Query: `serviceId`, `specialistId`, `date` (`YYYY-MM-DD`), all required.

`200 { "date": "2027-03-02", "slots": Slot[] }` — free start times, earliest first. Rules: [data model → availability rules](data-model.md#availability-rules).

- No working hours that day, or a date in the past: `200` with `"slots": []`.
- `400 validation_error`: a parameter is missing or malformed.
- `404 not_found`: unknown or archived service, unknown specialist, or the specialist does not offer the service.

### `POST /api/bookings`

```json
{ "serviceId": 2, "specialistId": 1, "startsAt": "2027-03-02T09:00:00.000Z", "clientName": "Ana Lopez", "clientEmail": "ana@example.com" }
```

`201 { "booking": Booking }` with `status: "active"`; `endsAt = startsAt + service duration`.

- `clientName`: trimmed, 1–80 characters. `clientEmail`: a valid email, stored lowercase.
- `startsAt` must be one of the slots `GET /api/availability` would return for that day, ignoring other bookings. Otherwise `400 validation_error` (off-grid, outside working hours, in the past, specialist does not offer the service).
- Overlaps an active booking of the specialist: `409 slot_taken`. This must hold under concurrency: two simultaneous requests for the same slot produce exactly one `201` and one `409`.
- Unknown or archived service, unknown specialist: `404 not_found`.
- *(SLOT-201)* When the request carries a session, the booking is linked to that account.

### Auth

Provided by [Better Auth](https://www.better-auth.com/docs) mounted at `/api/auth/*` (session cookie). Slotly uses email + password only (**SLOT-201**). The endpoints the UI and tests use:

| Endpoint | Body | Result |
| --- | --- | --- |
| `POST /api/auth/sign-up/email` | `{ name, email, password }` | `200`, sets the session cookie. Password 8–128 characters |
| `POST /api/auth/sign-in/email` | `{ email, password }` | `200` and cookie; wrong credentials: a `4xx` error |
| `POST /api/auth/sign-out` | — | `200`, clears the cookie |
| `GET /api/auth/get-session` | — | Session and user, or `null` |

These shapes are Better Auth's; Slotly does not wrap them.

### `GET /api/me/bookings`

`200 { "bookings": Booking[] }` — the signed-in client's bookings (active and cancelled), sorted by `startsAt`, earliest first. `401 unauthorized` without a session.

Bookings made while signed out are not shown, even with the same email.

### `POST /api/bookings/{id}/cancel`

**AC2 — Cancelling persists the status and frees the time.** The cancelled booking appears as cancelled in My bookings.

No body. `200 { "booking": Booking }` with `status: "cancelled"`.

- The freed time is immediately available again in `GET /api/availability` and can be booked.
- Cancelling an already cancelled booking returns `200` with the booking unchanged.
- `401 unauthorized` without a session; `404 not_found` for an unknown booking or someone else's.

### `PATCH /api/bookings/{id}`

```json
{ "startsAt": "2027-03-03T11:00:00.000Z" }
```

Moves the booking to another time; service, specialist and client stay the same. `200 { "booking": Booking }` with new `startsAt` and `endsAt`.

- `422 too_late` if the booking's **current** start is less than 2 hours from now (exactly 2 hours is allowed).
- The new time follows the same rules as `POST /api/bookings`: `400 validation_error` if it is not an offered slot, `409 slot_taken` if it overlaps another active booking. The booking's own current time does not block it.
- `400 validation_error` for a cancelled booking.
- `401 unauthorized`; `404 not_found` for an unknown booking or someone else's.
- Checks run in this order: auth → exists and owned → cancelled → too late → new time valid → free.
