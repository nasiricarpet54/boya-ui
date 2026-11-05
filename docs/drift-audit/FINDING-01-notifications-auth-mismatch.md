# F-01 — Public notifications endpoint trusts a cookie that is never set

**Severity:** Critical
**Type:** Auth mismatch (duplicate logic divergence)
**Status:** Open — needs verification against a running instance before marking Confirmed

## Files

- `server.ts:847-868` (live)
- `src/routes/admin.ts:267-283` (dead, but the obvious candidate to mount)

## The claim

The codebase has two implementations of `GET /api/notifications` that **look for different credentials**. One of them is reachable today.

The live handler at `server.ts:847` does its own auth inline instead of using `requireAuth`:

```ts
const authHeader = req.headers.authorization;
const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : (req as any).cookies?.auth_token;
if (token) {
  const decoded = verifyJwtToken(token);
  if (decoded && ['super_admin', 'salon_admin', 'line_manager'].includes(decoded.role)) {
    isStaff = true;
  }
}
```

The dead handler at `src/routes/admin.ts:271` uses the identical construction.

## Why this is the highest-severity finding

**1. `auth_token` is a phantom cookie.** Nothing in the codebase sets it. Login sets `token` (`server.ts:239`, `src/routes/auth.ts:118`), and the `requireAuth` middleware reads `req.cookies?.token` (`src/middleware/auth.ts:17`). A browser session will therefore never supply `auth_token`, and `isStaff` will silently be `false` for a legitimately logged-in salon admin using cookies. The endpoint then returns only `isActive: true` rows — the staff member sees the public feed instead of their management list, and has no way to tell they are seeing a filtered view.

**2. Bearer auth works, but bypasses every other session check.** With a Bearer header the check succeeds — and that is the problem: this is the only privileged read in the codebase that does **not** go through `requireAuth`. Compare what `requireAuth` does that this block does not:

| Check | `requireAuth` | Inline block |
|---|---|---|
| Token signature verified | ✅ | ✅ |
| Token revoked (blacklist) | ✅ `revokedTokens` | ❌ |
| User still exists in DB | ✅ | ❌ |
| Account suspended | ✅ 403 | ❌ |
| Role gate | via `requireRole` | inline `includes()` |

So a **suspended** or **deleted** staff member's still-signed JWT (valid up to 15 minutes after suspension) continues to pass this check, and a **revoked** token — one a user explicitly logged out of — passes too, because the blacklist is never consulted. `verifyJwtToken` alone cannot know. `requireAuth` knows and was written later specifically for this (see the era-2 hardening commits).

**3. The two copies disagree on the privilege model.** `requireRole` grants `super_admin` an unconditional bypass (`src/middleware/auth.ts:69-71`). This inline block instead enumerates the three staff roles. Today both include `super_admin`, so behavior coincides. The moment a role is added to one list and not the other — which is exactly what happened to every other duplicated responsibility in this codebase (see F-03, F-04, F-05) — the two authorizers diverge silently.

## Likely origin

Era 2 wrote `requireAuth`/`requireRole` as the centralized middleware (commits `bf8c9e28` role-based auth, `eee31694` secure token storage, `e87ecce7` enforce JWT_SECRET). The notifications endpoint's inline check reads like a *later* addition — or an earlier pattern that the middleware was written to replace and this endpoint was never migrated to. `src/routes/admin.ts` then copied the unmigrated version wholesale during the Era 3 extraction, preserving the bug in a second location and guaranteeing it survives any future "finish the extraction" work.

This is the signature pattern: **the middleware layer was built, and one endpoint was never routed through it, and the duplication then carried the omission forward.**

## Failure scenarios

- Salon admin opens the notifications management view in a browser (cookie auth): sees only active/public notifications; their management list silently empty. No error, no signal.
- Super admin suspends a malicious salon admin's account. That admin's existing JWT still returns the staff notification list for up to 15 minutes.
- Any user who has logged out (token blacklisted via `revokedTokens`) can still read the staff notification list with that logged-out token via Bearer.
- Next session mounts `src/routes/admin.ts` believing it is a faithful extraction, and inherits all of the above by default.

## Verification (what a second pair of eyes should check)

1. Confirm no `res.cookie('auth_token', …)` exists anywhere — search `cookie('auth_token` and `auth_token` across the repo, including `mobile/`. Also confirm no reverse proxy / Caddy rewrites inject it (check `Caddyfile*`).
2. With a live instance: log in as salon_admin in a browser, call `GET /api/notifications`, and confirm `isStaff` resolves false (i.e. the returned list is the `isActive`-filtered one).
3. Confirm whether any Flutter client uses Bearer for this endpoint — `mobile/customer_app/lib` auth handling determines whether the Bearer path is load-bearing or incidental.

## Suggested fix direction

Replace the inline block with the middleware the rest of the codebase already uses:

```ts
router.get('/notifications', requireAuth, requireRole(['super_admin', 'salon_admin', 'line_manager']), async (req, res) => { … })
```

and drop the `isStaff` branch entirely (staff sees all, everyone else hits a separate public/active filter — or, if the public list is genuinely needed on the same path, keep `requireAuth` and branch on `req.dbUser.role`). Delete the duplicated block in `src/routes/admin.ts` in the same change, or delete that module (see F-02).

Do not fix only one of the two copies. A half-fix here moves the drift rather than closing it.
