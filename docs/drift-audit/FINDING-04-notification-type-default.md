# F-04 — `notification.type` default disagrees across three layers

**Severity:** High
**Type:** Default-value drift (silently different stored value per code path)
**Status:** Open

## Files

- `src/lib/validation.ts:99` — Zod default `'informational'`
- `src/db/schema.ts:238` — Postgres column default `'promotional'`
- `server.ts:874-892` — handler destructured default `'promotional'`
- `src/routes/admin.ts:294-312` — handler destructured default `'promotional'`

## The claim

One field, `notifications.type`, gets a different default depending on which layer last touched the request.

```ts
// src/lib/validation.ts:96-106  (the Zod schema)
export const notificationCreateSchema = z.object({
  type: z.string().default('informational'),   // ← informational
  …
});

// src/db/schema.ts:234-251  (the table)
export const notifications = pgTable('notifications', {
  type: text('type').default('promotional').notNull(),   // ← promotional
  …
});

// server.ts:874  (the live handler)
const { type = 'promotional', … } = req.body;   // ← promotional
```

So:
- A POST to `/api/notifications` **through the Zod schema** (`schemas.notificationCreateSchema.parse`) stores `'informational'` when the client omits `type`.
- A POST that **bypasses Zod** — which is exactly what both live and dead handlers do, destructuring `req.body` directly with a `'promotional'` default — stores `'promotional'`.

The live handler at `server.ts:869` does not parse with `notificationCreateSchema` at all; it reads `req.body` and applies its own defaults. The Zod schema's `'informational'` default is therefore **dead** on the live path — a layer that was written, never connected, and now silently disagrees with the layer that is actually used.

## Why it matters

`type` is not decoration. `AdminNotificationsView.tsx` drives styling off it (`type === 'promotional' ? 'bg-gradient-to-r from-amber-600 to-rose-700' : …`, line 570) and offers it as an explicit four-value select (`promotional | informational | alert | discount`, line 514). Any audience-segmentation or filtering logic now or later keyed on `type` will see records split by *which code path created them* rather than by intent.

This is the canonical small-default-value drift: no error, no crash, rows that look correct in the table and classify differently downstream.

## Likely origin

Era 2 wrote the schema with the DB-side default (`'promotional'`). A later security/validation pass added `notificationCreateSchema` (the file's header describes it) and chose `'informational'` — arguably the safer default for an informational-vs-promotional dichotomy. Neither handler was ever updated to use the schema; `server.ts:869` and `admin.ts:289` both destructure manually. The schema and the handlers were written by sessions that did not reference each other.

Note the same shape appears in `bookingCreateSchema`, whose comments show the opposite (better) outcome — there the schema *is* the enforcement point and even documents why (`price` deliberately not accepted). Notifications did not get that treatment.

## Verification

1. Confirm `notificationCreateSchema` is never called on the live path: search for its usage (only `src/lib/validation.ts` defines it).
2. Confirm the DB column default by reading `drizzle/0000_perfect_harrier.sql` (the `notifications` table DDL).
3. Check `AdminNotificationsView.tsx:46` — the form's `useState` initial value is `'promotional'`, so the UI also defaults to promotional and the Zod default would only apply to a programmatic caller.

## Suggested fix direction

Pick one default, enforce it in exactly one place, and make the Zod schema the gate. Concretely: route `POST /api/notifications` through `notificationCreateSchema.parse(req.body)`, delete the manual destructured defaults from both handlers, and align the Zod default with the column default (or vice versa) as a deliberate decision. If `'informational'` is chosen, the column default should change too — otherwise rows inserted by any future non-schema path drift again.

Related and worth the same pass: `targetAudience` and `channel` defaults are consistent (`'all'` / `'in_app'`) across all three, which confirms this is a localized disagreement rather than a systematic one.
