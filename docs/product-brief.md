# Product brief

**Slotly** lets clients of small salons and studios book a visit with a specialist online, without calling. One salon per deployment, three to ten specialists, a few dozen bookings a day.

## Problem

Small salons take bookings by phone and messenger. The admin juggles a paper calendar, double-books specialists, and loses clients who call after hours. Big booking platforms are expensive and built for chains.

## Who uses it

| Person | Wants to |
| --- | --- |
| **Client** | See what the salon offers and what it costs, pick a time that suits them, change plans without calling |
| **Salon owner** | Stop double bookings and no-shows from forgotten changes. Owner tools are out of scope for this MVP; the owner edits the catalog in the database |

## MVP scope

Two sprints, six tickets. Each ticket lists the spec sections it touches.

| Sprint | Ticket | Outcome | Spec |
| --- | --- | --- | --- |
| 1. First booking, end to end | SLOT-101 Services page | The catalog shows only services the salon still offers | [Screens: Services](screens.md#services), [API: services](api.md#get-apiservices) |
| 1 | SLOT-102 Free time | A client picks a specialist and a day and sees free start times | [Screens: Book](screens.md#book-a-service), [API: availability](api.md#get-apiavailability), [Data model: availability rules](data-model.md#availability-rules) |
| 1 | SLOT-103 Create a booking | A client books a free time; the same time can never be booked twice | [Screens: Book](screens.md#book-a-service), [API: create booking](api.md#post-apibookings), [Data model: bookings](data-model.md#bookings) |
| 2. Clients manage their bookings | SLOT-201 Sign in and My bookings | A client creates an account, signs in and sees their bookings | [Screens: Account](screens.md#sign-up-and-sign-in), [Screens: My bookings](screens.md#my-bookings), [API: auth](api.md#auth) |
| 2 | SLOT-202 Cancel a booking | A client reaches cancellation from My bookings, cancels, and frees the time | [Screens: Cancel](screens.md#cancel-a-booking), [API: cancel](api.md#post-apibookingsidcancel), [Data model: bookings](data-model.md#bookings) |
| 2 | SLOT-203 Reschedule a booking | A client moves a booking to another free time, but not later than 2 hours before the visit | [Screens: Reschedule](screens.md#reschedule), [API: reschedule](api.md#patch-apibookingsid) |

## Out of scope

Payments, deposits, reminders by email or SMS, salon admin panel, multiple salons, time zones other than UTC, waitlists, reviews, mobile apps.

## Success for the MVP

- A first-time client books a visit in under a minute.
- Zero double bookings, even when two clients press "Confirm" at the same moment.
- Clients change or cancel visits themselves instead of calling.

## Glossary

| Term | Meaning |
| --- | --- |
| Service | Something the salon sells: name, duration, price. Archived services are hidden from clients |
| Specialist | A person who performs services and has weekly working hours |
| Slot | A possible start time for a service with a specialist on a given day |
| Booking | A client's reserved slot. Active or cancelled |
