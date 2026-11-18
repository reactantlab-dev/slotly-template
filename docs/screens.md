# Screens

Wireframes in text; Figma mockups will replace them later. UI copy is exact: **text in quotes is what the user sees**, and tests find elements by these roles, labels and texts. Change copy only together with the spec.

All times are shown in UTC, 24-hour format. Date-time format: **"Tue, Mar 2 · 10:00"**.

## Layout

Every page has a header with the **"Slotly."** logo (links to `/services`) and a nav (`<nav aria-label="Main">`):

| State | Nav items |
| --- | --- |
| Signed out | "Services", "Sign in" *(SLOT-201)* |
| Signed in *(SLOT-201)* | "Services", "My bookings", "Sign out" (button) |

Each page has exactly one `<h1>`. `/` redirects to `/services`.

## Services

`/services` · exists in the scaffold · fixed in **SLOT-101**

```
Book a visit
SERVICES                                  ← h1 "Services"
Pick a service, then choose a specialist and a time that suits you.

┌──────────────────────────────────────────────┐
│ Women's haircut                    [ Book ]  │  ← list "Services", one item per service
│ Wash, cut and blow-dry.                      │     item name = service name (h2)
│ (1 h)  $55                                   │     link "Book" → /book/{id}, accessible name "Book {service name}"
└──────────────────────────────────────────────┘
```

- Shows only active services, sorted by name A→Z (same as `GET /api/services`).
- Duration: "30 min", "1 h", "1 h 30 min". Price: "$55", "$35.50".
- No services: empty state "No services yet".

## Book a service

`/book/{serviceId}` · **SLOT-102** (pick a time) · **SLOT-103** (confirm)

```
h1: {service name}            e.g. "Men's haircut"
30 min · $30

Specialist           ← one radio button per specialist who offers the service, label = specialist name
( ) Leo Park
(•) Mia Torres

Date [ 2027-03-02 ]  ← input type=date, label "Date", defaults to today

Available times      ← group "Available times"
[09:00] [09:30] [10:00] …   ← one button per slot, label "HH:mm"; selected slot has aria-pressed="true"
                     ← no slots: text "No free times on this day"

── SLOT-103 ──
Your name [        ]  ← label "Your name"
Email     [        ]  ← label "Email"
[ Confirm booking ]   ← button, disabled until a slot is selected
```

- Unknown or archived service: Next.js 404 page.
- Changing specialist or date reloads slots and clears the selected slot.
- Validation errors show under the field (`Field` component `error`).
- Slot taken (API `409`): alert "This time was just taken. Please pick another one." and the slot list reloads.
- Signed-in client *(SLOT-201)*: name and email are prefilled from the account.
- Success → `/bookings/{id}`.

## Booking confirmed

`/bookings/{id}` · **SLOT-103**

```
h1: You're booked
Women's haircut with Mia Torres
Tue, Mar 2 · 10:00
[ Book another visit ] → /services
```

Shows no client name or email (the URL may be shared). Unknown id: 404 page.

## Sign up and sign in

`/sign-up`, `/sign-in` · **SLOT-201**

```
h1: Create account              h1: Sign in
Name     [        ]             Email    [        ]
Email    [        ]             Password [        ]
Password [        ]             [ Sign in ]
[ Create account ]              No account? Create one → /sign-up
Have an account? Sign in → /sign-in
```

- Password: at least 8 characters. Error under the field: "Use at least 8 characters".
- Email already registered: alert "An account with this email already exists".
- Wrong credentials: alert "Wrong email or password".
- Success → `/my-bookings`. "Sign out" → `/services`.

## My bookings

`/my-bookings` · **SLOT-201** · actions in **SLOT-202**, **SLOT-203**

```
h1: My bookings

┌────────────────────────────────────────────────┐
│ Women's haircut with Mia Torres     (Active)   │  ← list "Bookings", item name = "{service} with {specialist}"
│ Tue, Mar 2 · 10:00                             │     status badge "Active" or "Cancelled"
│ [ Reschedule ] [ Cancel booking ]              │  ← links; only for active bookings
└────────────────────────────────────────────────┘
```

- Signed out: redirect to `/sign-in`.
- Only the signed-in client's bookings, sorted by start time, earliest first, including cancelled ones.
- None: empty state "No bookings yet" with a link "Book a visit" → `/services`.
- **SLOT-202** "Cancel booking" links to `/my-bookings/{id}`. Cancellation must be reachable from My bookings.
- **SLOT-203** "Reschedule" (link → `/my-bookings/{id}/reschedule`): hidden when the visit starts in less than 2 hours.

## Cancel a booking

`/my-bookings/{id}` · **SLOT-202**

```
h1: Booking
Women's haircut with Mia Torres        (Active)
Tue, Mar 2 · 10:00
[ Cancel booking ]
[ Back to my bookings ] → /my-bookings
```

- "Cancel booking" cancels in place, with no browser dialog. The badge becomes "Cancelled" and the button disappears.
- Signed out: redirect to `/sign-in`.
- Not the client's booking, or unknown id: 404 page.

## Reschedule

`/my-bookings/{id}/reschedule` · **SLOT-203**

```
h1: Reschedule
Women's haircut with Mia Torres
Now: Tue, Mar 2 · 10:00

Date [ 2027-03-02 ]
Available times  [09:00] [09:30] …     ← same behavior as Book (slots from GET /api/availability)
[ Confirm new time ]
```

- Success → `/my-bookings`, the item shows the new time.
- Too late (API `422`): alert "Bookings can't be changed less than 2 hours before the visit."
- Not the client's booking, or unknown id: 404 page.
