# Drift Audit Registry — BOYA Platform

**Audit date:** 2026-11-05
**Auditor:** Codebase Archaeologist (drift-detection pass)
**Scope:** `server.ts`, `src/` (Express + Drizzle + React), `drizzle/` migrations, `mobile/customer_app` (Flutter, read-only cross-check), root docs.

**Headline:** This codebase is not one application. It is **three** — a monolithic `server.ts` (Era 2), a partially-extracted `src/routes/*` router layer (Era 3, never wired up), and a Flutter compatibility layer (Era 4) — all sharing one database. Most of the `src/routes/*` modules are **dead code that look live**, and the live code in `server.ts` contains duplicated logic that has already begun to disagree with itself.

The highest-severity item (F-01) is a real authentication/authorization discrepancy between two implementations of the same notification-listing endpoint, one of which is reachable today.

---

## View 1 — Findings (master list)

| ID | Finding | Files | Type | Severity | Status |
|---|---|---|---|---|---|
| F-01 | Public notifications endpoint has two auth variants: one checks a **cookie that is never set** (`auth_token`) instead of the real session | `server.ts:847-868`, `src/routes/admin.ts:267-283` | Auth mismatch (duplicate logic divergence) | **Critical** | Open |
| F-02 | Four of five `src/routes/*` modules are **dead code** — written, never mounted, shadowing live handlers in `server.ts` | `src/routes/{auth,admin,bookings,salons}.ts`, `server.ts` | Dead code / architectural drift | **Critical** (maintenance hazard) | Open |
| F-03 | Two independent in-memory OTP stores with different semantics; `src/routes/auth.ts` re-implements the Redis-backed one and misuses the OTP record as a rate-limit bucket | `server.ts:16-68,159-205`, `src/routes/auth.ts:16-127`, `src/routes/mobile.ts:48-110` | Duplicate implementation | **High** | Open |
| F-04 | `notification.type` default disagrees in three places: `'informational'` (Zod) vs `'promotional'` (DB + both handlers) | `src/lib/validation.ts:99`, `src/db/schema.ts:238`, `server.ts:874-892`, `src/routes/admin.ts:294-312` | Default-value drift | **High** | Open |
| F-05 | OTP rate limit **does not exist** in `src/routes/auth.ts` and `src/routes/mobile.ts` despite comments claiming "max 3 requests per 5 minutes" | `src/routes/auth.ts:35-45`, `src/routes/mobile.ts:53` | Missing control / comment-vs-code | **High** | Open |
| F-06 | Three identical "resolve salonId from tenantId" fallback blocks duplicated across booking read paths | `src/db/bookings.ts:145-149,186-190`, `src/routes/salons.ts:108-121` | Duplicate implementation | Moderate | Open |
| F-07 | `bookingCreateSchema` rejects `price`, but `createBooking()` accepts `price` and **both live callers pass it anyway** — the "server charges catalog price" guarantee is enforced in four places with three different mechanisms | `src/lib/validation.ts:21-24`, `src/db/bookings.ts:69`, `server.ts:504`, `src/routes/bookings.ts:35`, `src/routes/mobile.ts:401` | Defense-in-depth drift | Moderate | Open |
| F-08 | Client-side fake tracking code generation as UX fallback: `BY-<random>` fabricated when the server omits one | `src/shared/components/modals/BookingModal.tsx:144` | Silent fabricated state | Moderate | Open |
| F-09 | Booking record's `paymentStatus` is set once at creation and never advanced; `/finance` mixes "completed" status with "unpaid" payment status | `src/db/bookings.ts:80`, `src/routes/mobile.ts:522-562`, `src/db/schema.ts:119` | State-existence / workflow gap | Moderate | Open |
| F-10 | `/api/salons` and `/api/managed/salons` duplicated between `server.ts` and `src/routes/salons.ts`; the dead copy has the **newer** specialist-flattening fix | `server.ts:330-419`, `src/routes/salons.ts:19-135` | Half-migrated improvement | Moderate | Open |
| F-11 | `salons.status` column has no schema or writer; admin UI sets it and `AdminApprovalsView` filters on it | `src/db/schema.ts:55-78`, `src/features/admin/components/AdminApprovalsView.tsx:24`, `src/features/admin/components/AdminDashboardView.tsx:30-31` | Orphaned field / write loss | Moderate | Open |
| F-12 | Specialist working-hours migrations conflict: `0003_working_hours.sql` and `0004_specialist_working_hours.sql` both add `working_hours`; `_journal.json` only knows 0003 | `drizzle/0003_working_hours.sql`, `drizzle/0004_specialist_working_hours.sql`, `drizzle/meta/_journal.json` | Migration metadata drift | Moderate | Open |
| F-13 | `requireRole` grants `super_admin` a blanket bypass, while the sibling auth check in `GET /api/notifications` enumerates roles manually and *does not* | `src/middleware/auth.ts:69-71`, `server.ts:851-857` | Inconsistent privilege model | Moderate | Open |
| F-14 | Docs claim rate limit "100 requests/15 minutes"; the imported `express-rate-limit` is **never used** — only a per-phone OTP counter exists | `PRODUCTION_READINESS.md:38`, `server.ts:5`, `server.ts:66-68` | Doc/code mismatch | Low | Open |
| F-15 | `boya_full_code.txt` / `boya_shared_code.txt` (~1.6 MB) and `dist/` are stale snapshots committed alongside source; `.gitignore` ignores `dist` but it is present in the tree | `boya_full_code.txt`, `boya_shared_code.txt`, `dist/` | Stale artifact / repo hygiene | Low | Open |
| F-16 | `rollback.ts` is a destructive one-shot script that drops columns still owned by live migrations, with no confirmation | `src/db/rollback.ts` | Hazardous tooling | Low | Open |

---

## View 2 — Eras

Reconstructed from 104 commits over 2026-10-30 → 2026-11-05 (6 days of dense multi-tool work).

| Era | Approx. dates | Dominant pattern | Representative files |
|---|---|---|---|
| **Era 1** — Firebase/mock frontend | Initial commit → Oct 31 | Client-side mock data, Firebase UID identity, `boya_full_code.txt` snapshot | `src/shared/data/marketplaceData.ts`, `boya_full_code.txt` |
| **Era 2** — Express monolith in `server.ts` | Oct 31 – Nov 2 | All routes inline in one 1103-line `server.ts`; phone OTP + JWT; Drizzle schema; security hardening pass (P1 notes) | `server.ts`, `src/db/schema.ts`, `src/lib/jwt.ts` |
| **Era 3** — Extraction to `src/routes/*` (abandoned) | Nov 2 – Nov 3 | Router modules created (`auth.ts`, `admin.ts`, `salons.ts`, `bookings.ts`), each a near-copy of the `server.ts` handler. **Never mounted.** | `src/routes/*.ts` |
| **Era 4** — Merge/recovery + Flutter compat | Nov 3 – Nov 4 | "merge main", "resolve conflicts keeping stable server code", `sanitizeRole` import fix; `src/routes/mobile.ts` added as a live adapter layer | `src/routes/mobile.ts`, merge commits (`f25ba73c`, `6f189c7e`, `60ce0513`) |
| **Era 5** — Stabilization whack-a-mole | Nov 4 – Nov 5 | Repeated identical fixes (`fix: prevent pool.end from closing shared app pool` ×6), `fix: handle null roles in SalonCard filtering`, notifications CRUD | `src/db/migrate.ts`, commits `18ad9a9a`–`48ae0b8f` |

**Key era boundary — the Era 2→3 extraction that never completed.** `server.ts` still registers `app.post('/api/auth/send-otp', …)` directly, and only `src/routes/mobile.ts` is mounted (`app.use('/api/v1', mobileRoutes)` at `server.ts:1068`). The other four router files have **zero importers** (verified by search across `src/` and `server.ts`). They are Era 3 fossils: they look authoritative — newer than `server.ts`, sometimes containing the better code (F-10) — but no request can reach them. The `pool.end` fix repeated six times (F-17 below) is the signature of this era: the same bug was fixed over and over because the *live* path and the *shadow* path kept being confused for each other.

---

## View 3 — Responsibilities

| Responsibility | Implementations found | Consistent? |
|---|---|---|
| OTP send/verify + storage | `server.ts` (Redis-or-memory, rate-limited via `rateIncr`), `src/routes/auth.ts` (memory Map, reuses OTP record as rate bucket), `src/routes/mobile.ts` (`memOtpStore` Map, no rate limit) | **No** — 3 implementations, 2 storage backends, 1 missing rate limit (F-03, F-05) |
| HTTP auth check | `src/middleware/auth.ts` (`requireAuth` + `requireRole`, cookie `token` / Bearer), `server.ts:851` + `src/routes/admin.ts:271` (manual `verifyJwtToken` on cookie `auth_token`) | **No** — different cookie names, different privilege rules (F-01, F-13) |
| Salon list + availability | `server.ts:330` and `src/routes/salons.ts:19` (identical except specialist flattening) | **No** — the dead copy is the fixed one (F-10) |
| Booking creation | `server.ts:491`, `src/routes/bookings.ts:23`, `src/routes/mobile.ts:394` — all delegate to `createBooking` in `src/db/bookings.ts` | Mostly yes, but each re-fetches the service price independently and passes `price` differently (F-07) |
| Zod validation schemas | `src/lib/validation.ts` (server, authoritative), `src/shared/utils/validation.ts` (client, `loginSchema`/`otpSchema`/`bookingSchema` — different shapes, different messages) | **No** — two schema libraries for overlapping fields (F-18 below) |
| Date/time normalization | `src/shared/utils/dateIsoConverter.ts` (single source, `null` on failure) | **Yes** — single implementation, correctly return-`null` contract |
| Role normalization | `src/shared/constants/roles.ts` (`ROLES`, `isStaff`), `src/db/users.ts` (`sanitizeRole` with legacy alias map), `src/middleware/auth.ts` (inline `super_admin` bypass) | Partially — sanitizeRole maps legacy names, but nothing emits them anymore |
| Notifications create/broadcast | `server.ts:869` (POST), `server.ts:540` and `server.ts:973` (**duplicate** `/api/notifications/broadcast` registrations), `src/routes/admin.ts:289` | **No** — same route registered twice in one file; second registration wins silently (F-19) |
| Revenue summation | `src/routes/mobile.ts:522` (dashboard) and `:552` (finance) | Yes — both `sum(Number(b.price||0))` over `completed`; **but** see paymentStatus gap (F-09) |
| Tracking code generation | `src/db/bookings.ts:22` (crypto-secure, server), `BookingModal.tsx:144` (client `Math.random` fallback) | **No** — client fabricates a code the DB will reject as duplicate (F-08) |
| PII redaction | `src/lib/piiRedactor.ts` (single module) | Yes — single implementation, used consistently |
| Persian digit/phone normalize | `src/shared/utils/persianUtils.ts` (single module used by both client and server) | Yes |

---

## View 4 — Risk Priority

### Critical — breaks trust, leaks data, or mis-authorizes (fix now)

- **F-01** — `GET /api/notifications` reads `req.cookies?.auth_token`, a cookie **no code path ever sets** (the app sets `token`; see `src/routes/auth.ts:118` and `server.ts:239`). Consequences, depending on which copy you read:
  - **Live copy (`server.ts:851`):** a Bearer header works, so a staff member *can* authenticate — but the check runs **before** any expiry/revocation/user-status verification, and it is the *only* privileged endpoint in the codebase that does not go through `requireAuth`. A logged-out staff member's stale token, or a token whose account was suspended, still passes.
  - **Dead copy (`src/routes/admin.ts:271`):** unreachable today, but it is a trap for the next session that "finishes the extraction" and mounts it.
  - This is the clearest example of the audit's core pattern: two implementations of one responsibility, written by different eras, that disagree on *which credential to trust*.

### High — controls that look present but are not

- **F-03** — OTP stores: `server.ts` (Redis, survives restart, multi-instance) vs `src/routes/auth.ts` (`memOtp` with `setTimeout` purge) vs `src/routes/mobile.ts` (`memOtpStore`). The Era 3 `auth.ts` copy even **overwrites the OTP record with the rate-limit bucket** (`src/routes/auth.ts:39-42` writes `{count, firstAt}` into `otp:<phone>`, then line 48 overwrites it with `{code, attempts}` — so rate limiting there is effectively a no-op *and* would clobber a valid pending code on the next send). In memory, a restart or a second instance silently invalidates every outstanding OTP.
- **F-04** — `notification.type` default: `'informational'` (Zod) vs `'promotional'` (DB default, and both handlers' destructured default). A POST via the validation layer lands as `informational`; a POST that bypasses Zod (as the dead `admin.ts` copy does at line 294) lands as `promotional`. That record then drives the admin UI's styling and audience segmentation.
- **F-05** — Comments in `src/routes/auth.ts:35` and `src/routes/mobile.ts:53` both state "max 3 requests per 5 minutes". Neither implements any check. (The live `server.ts` handler does implement it via `rateIncr`.)

### Moderate — works today, disagrees with itself under conditions

- **F-07** — Price enforcement is stated in the schema comment ("`price` is deliberately NOT accepted"), enforced at the route layer (each handler re-fetches `serviceRow.price`), and re-enforced inside `createBooking` (`cleanPrice` from `srvRecord`). The redundancy is fine as defense in depth, but `createBooking`'s `price` parameter is now dead weight that *invites* a future caller to pass a client-supplied value. One mechanism should be canonical.
- **F-08** — `BookingModal.tsx:144` invents `BY-<Math.random>` when the response lacks `trackingCode`. The column is `unique`; the fabricated value collides with nothing in the *client's* memory but the booking will fail server-side on the retry. The user sees a confirmation with a code that does not exist.
- **F-09** — `paymentStatus` is born `'unpaid'` and no code path ever changes it (only `status` is updated, at `src/db/bookings.ts:217`). `/finance` therefore reports `pendingPayments` = every booking ever made, forever, including fully-completed ones. The two enums (`booking_status`, `payment_status`) model one workflow that only half moves.
- **F-10** — `src/routes/salons.ts` contains the specialist-flattening fix ("ADMIN FIX" comment) that `server.ts:407-419` lacks; `/api/managed/salons` from `server.ts` returns raw relation rows. The improvement is stranded in dead code.
- **F-11** — `AdminDashboardView` writes `{ isApproved: true, status: 'active' }`, `salonUpdateSchema` accepts `status`, but **no column named `status` exists on `salons`** and no handler writes it. Admin approval sets `isApproved`; the UI's own `AdminApprovalsView` *also* filters on `s.status === 'pending'`, which is always false. Half the approval UI is reading a field that does not exist.
- **F-12** — `drizzle/0003_working_hours.sql` and `drizzle/0004_specialist_working_hours.sql` both add `working_hours`; the journal only registers 0003. `drizzle-kit` will next generate a migration assuming 0003 ran, and 0004's own comment ("was local-only state") shows it was written by a session unaware of 0003.
- **F-13** — `requireRole` lets `super_admin` through any role gate; the manual check in `/api/notifications` instead enumerates `['super_admin','salon_admin','line_manager']`. Functionally equivalent for super_admin today, but the two models will diverge the moment a new role is added to one and not the other.

### Low / Cosmetic

- **F-06** — The tenantId→id fallback appears 3×; unify into one helper (`resolveSalonId`).
- **F-14** — `PRODUCTION_READINESS.md:38` claims "100 requests/15 minutes" rate limiting. `express-rate-limit` is imported at `server.ts:5` and never called. Doc claims a control that does not exist.
- **F-15** — `boya_full_code.txt` (1.1 MB) and `boya_shared_code.txt` (510 KB) are era-1 snapshots that will be mistaken for source; `dist/` is present though gitignored.
- **F-16** — `rollback.ts` drops `license_doc_url` and both `publication_status` columns with `process.exit(0)` — it deletes production state silently in one run.

---

## Verified safe (checked, no issue found — recorded so the next audit does not re-derive it)

- **Money unit representation (Toman, integer).** Traced end to end: `services.price` is `decimal(12,0)` "In Toman" (`src/db/schema.ts:86`); `bookings.price` is `decimal(12,0)` (`:124`); every insert path passes `String(serviceRow.price)`; the client renders with `formatPrice` (`persianUtils.ts:11`, `toLocaleString('en-US')` then Persian digits); `/finance` and `/dashboard` sum `Number(b.price)` over `completed` only. **No cents/dollars mismatch, no double-conversion.** The one inconsistency is that mobile's `/salons` response converts to `Number` (`mobile.ts:341`) while the web API returns the decimal string —both are consumed consistently by their respective clients.
- **Date/time normalization.** Single implementation (`dateIsoConverter.ts`), `null`-on-failure contract honored at all three call sites (`src/lib/validation.ts:35-44`, `src/db/bookings.ts:28-31`, `server.ts`/`salons.ts` slot builders). The file's own header documents the old silent-"today" bug, and no caller reintroduces it.
- **Refresh-token rotation.** `server.ts` `/api/auth/refresh` deletes the presented token before minting a new one, checks expiry and suspension, and the client's `apiClient.ts` single-flights concurrent 401 refreshes. Consistent across the live web path. (The Era 3 `auth.ts` copy and `mobile.ts` have their own refresh handlers — see F-03 for the store divergence, but rotation logic itself is consistent.)
- **Double-booking guard.** A genuine existence guarantee: partial unique index `unique_specialist_slot` on `(specialistId, date, time) WHERE status != 'cancelled'` (`src/db/schema.ts:128`), pre-normalized by the Zod transform so the constraint compares canonical values. This is exactly the "explicit guarantee" an event-handler audit looks for, and it is present.
- **Suspension enforcement.** Checked in `requireAuth` (`auth.ts:47`), in verify-otp (`server.ts:213`), and on refresh (`server.ts:266`). Consistent.
- **PII redaction.** One module, used on both the web and mobile read paths.

---

## Convention notes for the nextaudit

1. **The `pool.end` echo.** `fix: prevent pool.end from closing shared app pool` appears as commits `1ef2bd56`, `80fbc9ca`, `3b958164`, `edd3260d`, `18ad9a9a`, `afb77c4e`, `48ae0b8f`. The fix in `src/db/migrate.ts` is correct and well-commented (`ownsPool` guard). Repeated identical commits are not evidence of an unfixed bug — they are evidence of a workflow where the same patch was applied to divergent branches. **Do not re-flag this.** If `migrate.ts` still reads `createPool()` as its fallback (`:41`) and closes only when `ownsPool`, it is fine.
2. **Do not trust file recency.** `src/routes/*` files are newer than the corresponding `server.ts` blocks and contain fixes the live code lacks. Newer ≠ live, and newer ≠ correct.
3. **F-02 is the root finding.** F-01, F-03, F-04, F-05, F-06, F-10 and F-13 are all *symptoms* of the Era 3 extraction that left two copies of the truth. Fixing them one by one will not close the drift; the copies must be reconciled or deleted.

---

## Suggested fix order

1. **F-01** — route `GET /api/notifications` through `requireAuth` + `requireRole(['super_admin','salon_admin','line_manager'])` and delete the manual `auth_token` block in both copies.
2. **F-02** — decide the fate of `src/routes/{auth,admin,bookings,salons}.ts`. Either finish the extraction (mount them and delete the inline `server.ts` handlers) or delete the modules. **Not mounting and not deleting is the worst of the three options**, which is the current state.
3. **F-04, F-05** — single OTP/notification source of truth once F-02 is decided.
4. **F-09** — add a payment-status transition wherever booking status moves to `completed`.
5. **F-11, F-12** — schema/migration reconciliation.
