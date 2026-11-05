# F-11 — `salons.status` is written by the admin UI, accepted by Zod, and does not exist in the schema

**Severity:** Moderate
**Type:** Orphaned field / silent write loss
**Status:** Open — needs a `psql \d salons` confirmation against the live database

## Files

- `src/lib/validation.ts:74` — `salonUpdateSchema` accepts `status: z.enum(['active','pending','suspended'])`
- `src/features/admin/components/AdminDashboardView.tsx:30-31` — writes `{ isApproved: true, status: 'active' }` / `{ isApproved: false, status: 'suspended' }`
- `src/features/admin/components/AdminApprovalsView.tsx:24` — filters on `s.status === 'pending'`
- `src/db/schema.ts:55-78` — **no `status` column on `salons`**
- `server.ts:420-436` — `PATCH /api/salons/:id` spreads the parsed patch straight into `db.update(salons).set(patch)`

## The claim

The admin UI operates on a `status` field for salons. The schema has no such column.

```ts
// src/lib/validation.ts:67-81 — the schema accepts it
export const salonUpdateSchema = z.object({
  isApproved: z.boolean().optional(),
  // `status` used to be sent by the admin dashboard and silently dropped by
  // Zod, so the salon status never persisted. It is now part of the schema.
  status: z.enum(['active', 'pending', 'suspended']).optional(),   // ← "It is now part of the schema"
  …
});

// src/db/schema.ts:55-78 — the table
export const salons = pgTable('salons', {
  tenantId, name, address, phone, province, city, district,
  latitude, longitude, rating, reviewsCount,
  isApproved, isVip, vipBadgeLabel, isMobileServiceActive,
  coverImage, gallery, licenseDocUrl, ownerName, displayPriority, createdAt,
  // ← no `status`
});
```

The Zod comment is the smoking gun: a previous session noticed `status` was being **dropped** by Zod, and "fixed" it by adding the field to the *Zod schema*. The DB schema was never updated. The problem was diagnosed correctly and half-fixed — exactly the half-fix pattern, with the comment itself recording that the author believed the fix complete.

## Current behavior

`PATCH /api/salons/:id` does `db.update(salons).set(patch)`, where `patch` includes `status`. Drizzle will generate `UPDATE salons SET … status = 'active' …`. Outcome against Postgres: **error** — `column "status" of relation "salons" does not exist`. So an admin approving a tenant via `AdminDashboardView` (which sends `status` on every approve/reject) would get a 500 from the server and see "خطا در ویرایش."

Unless — and this is why the finding needs a live check — the column was added by hand or by a migration outside Drizzle's knowledge. `migrate.ts` has an `ensureColumns`-style list; `status` is not in it. The `drizzle/*.sql` files do not add it. If the DB was seeded from `0000_perfect_harrier.sql` only, the column is absent and every `AdminDashboardView` approval fails. If someone ran a manual `ALTER TABLE`, the column exists without Drizzle knowing, `db.update` will now succeed, and the app has an invisible column that the ORM will drop on the next `drizzle-kit` push.

Meanwhile `AdminApprovalsView.tsx:24` filters `!s.isApproved || s.status === 'pending'` — reading a field the API response does not contain (the detail endpoints return Drizzle-mapped rows), so `pendingTenants` is computed on a permanently-undefined value and the `status === 'pending'` branch is dead.

## Likely origin

Two-layer half-fix across eras. Era 1/2 had a salon `status` concept in the UI. The validation pass (Era 2 hardening, `d8fb4377` "enforce salon approval filtering and secure admin updates" and `119e5bb4` "update schema and improve admin management") added `status` to Zod with the comment above, believing it was unblocking a known bug. No corresponding `ALTER TABLE` or schema.ts change was made. `AdminApprovalsView`, written later still, then read the field as if it were live.

## Verification

This finding **must** be confirmed against the running database before it is marked Confirmed:

1. `psql $DATABASE_URL -c '\d salons'` — does a `status` column exist?
2. If absent: `AdminDashboardView` approve/reject is broken in production (500 on every call). Confirm by tracing `onApproveTenant` (`AdminDashboardView.tsx:30`) → `updateSalon` → `PATCH /api/salons/:id` → `db.update(salons).set({isApproved, status})`.
3. If present: confirm it is undocumented in `schema.ts` and therefore at risk from the next `drizzle-kit` sync, and check what writes it.

## Suggested fix direction

Decide whether salon lifecycle state lives in `status` or in `isApproved` (plus `publicationStatus`, which the 0001 migration already added for services/specialists but **not** salons). Then:

- **Option A:** add the column properly — `status` to `schema.ts` + a real migration, with the UI writing it consistently.
- **Option B:** remove it — drop `status` from `salonUpdateSchema`, from `AdminDashboardView`'s approve/reject payloads, and from `AdminApprovalsView`'s filter (filter on `!isApproved` alone).

Option B is smaller and matches how the rest of the codebase actually models salon visibility (`isApproved` gates the public list at `server.ts:336`). Option A matches the admin UI's evident intent. Either is fine; **carrying both a phantom field and a comment claiming it is fixed is not.**
