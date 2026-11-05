# F-02 — Four route modules are dead code shadowing live handlers in server.ts

**Severity:** Critical (structural — the root cause of F-01, F-03, F-04, F-05, F-06, F-10, F-13)
**Type:** Architectural drift / abandoned extraction
**Status:** Open

## Files

- **Live:** `server.ts` (1103 lines, registers ~60 routes directly on `app`)
- **Dead:** `src/routes/auth.ts` (203 lines), `src/routes/admin.ts` (541), `src/routes/salons.ts` (215), `src/routes/bookings.ts` (57)
- **Live (mounted):** `src/routes/mobile.ts` (709) — mounted at `server.ts:1068` as `app.use('/api/v1', mobileRoutes)`

## The claim

`src/routes/` looks like a normal Express route layer. **Five of its six modules are never imported by anything.** Only `mobile.ts` is mounted.

### Evidence — no importers exist

A search across `src/` and `server.ts` for any import of these modules returns nothing:

- `grep -rn "routes/(auth|admin|bookings|salons)" src/` → no matches
- `grep "from '.*routes/" server.ts` → no matches
- `server.ts` registers the same paths inline: `app.post('/api/auth/send-otp')`, `app.get('/api/users')`, `app.post('/api/notifications')`, `app.get('/api/bookings')`, etc.

So there are **two complete, parallel implementations of the entire web API**: the live one in `server.ts` and the unreachable one in `src/routes/*`. Only one request path exists; the modules are load-bearing only in the sense that they are compiled.

### Evidence — the dead copies are newer and sometimes better

`src/routes/salons.ts` contains the specialist-flattening fix (commented "ADMIN FIX") that the live `server.ts` handler lacks:

```ts
// src/routes/salons.ts:82-96   (dead)
const specialists = (s.specialists || []).map((sp: any) => ({
  name: sp.user?.fullName || '',
  avatar: sp.avatarUrl || sp.user?.avatar || '',
  role: sp.user?.role || 'salon_specialist',
  …
}));

// server.ts:407-419   (live)
const rows = await db.query.salons.findMany({ … });
res.json(rows);   // raw relation rows, no flattening
```

The improvement is stranded in unreachable code. Meanwhile the live `/api/managed/salons` returns raw specialist relation rows — meaning the salon admin panel's view of its own specialists is the version **without** the fix. A future session that "fixes" this by patching `server.ts` will be duplicating work already written.

## Why this is Critical and not merely cleanup

This is not ordinary dead code. It is **the enabling condition for most other findings in this audit**:

| Finding | How F-02 causes it |
|---|---|
| F-01 | Two copies of the auth check → one checks a phantom `auth_token` cookie |
| F-03 | Two independent OTP stores (`server.ts` Redis vs `auth.ts`/`mobile.ts` in-memory) |
| F-04 | `type` default `'informational'` vs `'promotional'` across copies |
| F-05 | Rate limit present in live copy, missing in the dead copies that carry comments *claiming* it exists |
| F-06 | The tenantId→salonId fallback duplicated in both booking read paths and `salons.ts` |
| F-10 | The `/api/salons` + `/api/managed/salons` pair, duplicated with the fix on the wrong side |
| F-13 | `requireRole` super_admin bypass vs the inline enumeration in the notifications copies |

Every one of these is "two implementations of one responsibility that disagree." F-02 is why those two implementations exist at all.

The mechanism is the **Era 2 → Era 3 extraction that was never completed and never rolled back** (see the registry's Era view): the router modules were created as near-copies of the inline handlers, the extraction was abandoned before mounting, and the codebase kept evolving the `server.ts` side. The two sides have drifted apart in the ~3 days since, and each subsequent fix applied to only one side moved them further.

There is also a second-order trap: because the dead copies import live modules (`requireAuth`, `createBooking`, the Zod schemas, `sanitizeRole`), they **type-check and lint clean**. Nothing in the build surfaces their deadness. `npm run lint` passing tells you nothing about whether these files do anything.

## What the git history says

The extraction sits between two merge events (Era 3→4 boundary, commits `f25ba73c` "merge main to align history", `b1176369` PR #1, then `6f189c7e` "resolve conflicts keeping stable server code"). The merge commits resolved the server.ts-vs-routes tension by **keeping `server.ts`** (see `041fdc03` "fix: accept GitHub version for server.ts to resolve conflict" and `b1ba9a51` "Update server.ts") — the router layer lost, but was never deleted.

Then Era 5 begins, and its first act is the `pool.end` fix repeated six times (`1ef2bd56`, `80fbc9ca`, `3b958164`, `edd3260d`, `18ad9a9a`, `afb77c4e`, `48ae0b8f`): the same defect patched over and over across branches that each contain a different mix of live and shadowed code. That repetition is the sound of a codebase that cannot tell which of its two API layers is real.

## Failure scenarios

- **Any future session** reads `src/routes/admin.ts` or `auth.ts` as "the API," edits it, and is confused when nothing changes. Given these are the newer, cleaner-looking files, this is the *expected* outcome, not an edge case.
- Conflicting changes accumulate: a fix goes into the dead copy (as with the specialist flattening), the live copy keeps the bug, and nobody notices because the dead copy's tests/editors pass.
- An attempt to "finish the extraction" mounts all four modules while the `server.ts` handlers are still registered. Express would then have **two handlers per path** — the first registered wins, which is `server.ts` in most cases, but the notification inline-auth bug (F-01) would suddenly become reachable through a second path with the `auth_token` phantom cookie.
- Bundle/lint complexity: the modules participate in `tsc --noEmit` and eslint, so refactors ripple into files that no request will ever touch.

## Verification

1. Confirm zero importers: search for `routes/auth`, `routes/admin`, `routes/salons`, `routes/bookings` across `src/`, `server.ts`, `e2e/`, and `.storybook/`.
2. Confirm `server.ts` registers the same paths inline (lines 159–1067 list them; key overlaps: `/api/auth/*`, `/api/users`, `/api/services`, `/api/specialists`, `/api/notifications`, `/api/notifications/broadcast` (twice, see F-19), `/api/tickets`, `/api/admin/profile`, `/api/line-manager/staff`).
3. Confirm only `mobile.ts` is mounted: `server.ts:1067-1068`.

## Suggested fix direction

Three options, in order of preference:

1. **Finish the extraction.** Mount the four modules, delete the corresponding inline handlers from `server.ts`, and in doing so reconcile each duplicated responsibility (F-01, F-03, F-04, F-05) to a single implementation. Highest upfront cost, kills the entire drift family. Note `src/routes/admin.ts` also contains `router.get('/health')` at a path that `server.ts` registers at `/api/health` — mounting it at `/api` requires care.
2. **Roll back the extraction.** Delete the four modules, accept `server.ts` as the monolith, and port the specialist-flattening fix from `salons.ts` into the live handler. Cheapest now, but the monolith keeps growing.
3. **Status quo.** Not recommended. This is what produced F-01, and every new duplicated responsibility adds another silent disagreement.

Whatever is chosen, **do it as one decision**, not a gradual drift toward one side. Half-mounting (some routes in `server.ts`, some in modules) is a fourth state and strictly worse than any of the three above.

Note: the duplicated `/api/notifications/broadcast` registration inside `server.ts` itself (lines 540 and 973) is an independent instance of the same pattern *within* the live file — two handlers, one path, second-registration-wins. Fix it in the same pass.
