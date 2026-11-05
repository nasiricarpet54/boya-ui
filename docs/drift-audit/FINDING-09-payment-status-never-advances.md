# F-09 — `paymentStatus` is born `unpaid` and no code path ever changes it

**Severity:** Moderate
**Type:** State-existence / incomplete workflow
**Status:** Open

## Files

- `src/db/schema.ts:119` — `paymentStatus: paymentStatusEnum('payment_status').default('unpaid').notNull()`
- `src/db/bookings.ts:80` — every insert sets `paymentStatus: 'unpaid'`
- `src/db/bookings.ts:217-237` — `updateBookingStatus` sets **only** `status`
- `src/routes/mobile.ts:522-562` — `/finance` reads `paymentStatus === 'unpaid'` as "pending payment"
- `src/routes/mobile.ts:567+` — `/bookings/calendar`

## The claim

The schema models a full payment lifecycle — `paymentStatusEnum('unpaid', 'deposit_paid', 'fully_paid', 'refunded')` at `schema.ts:22-27`, with a `transactions` table (`deposit` / `full` types, `success` / `failed` statuses) ready to feed it.

**Nothing ever advances `paymentStatus`.**

```ts
// src/db/bookings.ts:217 — the ONLY booking update path
export async function updateBookingStatus(bookingId: number, status: any) {
  const [updated] = await db.update(bookings)
    .set({ status })           // ← booking_status only; paymentStatus never touched
    …
}
```

Grep confirms it: `paymentStatus` appears at the schema definition, at the insert (always `'unpaid'`), and in the `/finance` read filter. **There is no write site anywhere in `src/`, `server.ts`, or `src/routes/` that transitions it.** The enum has four values; the database will only ever contain one of them.

## Why it matters

`/finance` (`mobile.ts:552`) reports:

```ts
pendingPayments: allBookings.filter((b) => b.paymentStatus === 'unpaid').length,
```

Because `paymentStatus` is permanently `'unpaid'`, **`pendingPayments` equals the total number of bookings ever created** — including every booking whose `status` is `completed`. A salon admin reading the finance dashboard sees a "pending payments" count that can never reach zero and never reflects reality. It is not a wrong number because of a bug; it is a wrong number because half of a workflow was built.

This is the state-existence assumption category: the finance handler *reads* a field on the assumption that some other process updates it. No such process exists, and there is no code-level guarantee connecting the two — the audit's definition of a finding, met exactly.

## Likely origin

The payment lifecycle was designed top-down (schema `payment_status` enum + `transactions` table, both present in `0000_perfect_harrier.sql`) but only the booking-status half was wired to the API. `updateBookingStatus` was written for the salon panel's status buttons (pending/confirmed/completed/cancelled/rescheduled), and no payment integration (gateway, deposit flow) was ever built. The `/finance` endpoint was then added on top (Era 4, the mobile compatibility layer) and consumed a field nobody populates.

## Failure scenarios

- Salon admin's `pendingPayments` count grows monotonically forever and includes completed, fully-paid-in-cash bookings. Any business decision made from that number is wrong.
- If a payment gateway is later added and writes `deposit_paid`/`fully_paid` directly, nothing in the current code coordinates that with `booking.status` — the two enums will be free-floating.
- A future session reading `/finance` may "fix" the count by filtering on `status !== 'completed'` rather than fixing the payment state, compounding the workflow gap.

## Verification

1. Grep for any write to `paymentStatus` outside the insert: confirms only `bookings.ts:80` sets it.
2. Confirm the `transactions` table is referenced only by schema relations — no route inserts into it (search `db.insert(transactions)`).

## Suggested fix direction

Either complete the workflow or stop reporting the field. The minimal honest fix: when `updateBookingStatus` sets `status: 'completed'`, also set `paymentStatus: 'fully_paid'` (or drive it from a payment confirmation), so the two enums stay consistent. The cleaner fix is to make `paymentStatus` derive from the `transactions` table, which is what the schema was clearly designed for — but that is a feature, not a drift fix. Until one of those happens, `pendingPayments` should be dropped or relabeled, because it is displaying a constant.
