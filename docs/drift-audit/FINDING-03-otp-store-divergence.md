# F-03 — Three OTP implementations, two storage backends, one missing rate limit

**Severity:** High
**Type:** Duplicate implementation with behavioral divergence
**Status:** Open

## Files

- `server.ts:16-68` (helpers) + `server.ts:159-205` (send/verify) — **live, Redis-backed**
- `src/routes/auth.ts:16-127` — **dead**, in-memory, rate-bucket bug
- `src/routes/mobile.ts:48-110` (`memOtpStore` declared at `:709`) — **live**, in-memory

## The claim

OTP send/verify is implemented three times. They disagree on persistence, on the rate-limiting mechanism, and on what the stored record means.

### 1. Storage backends disagree

| Implementation | Store | Survives restart? | Works multi-instance? |
|---|---|---|---|
| `server.ts` | Redis if `REDIS_URL`, else `memOtp` Map | Redis: yes / memory: no | Redis: yes / memory: no |
| `src/routes/auth.ts` | `memOtp` Map, always | No | No |
| `src/routes/mobile.ts` | `memOtpStore` Map, always | No | No |

The Redis backing was added deliberately — commit `eaae268d` is literally "stable deployment with Redis OTP and restored API routes", and `server.ts:46` logs "[REDIS] Connected (durable OTP store)". The Flutter layer (`mobile.ts`) then introduced a **third** store that ignores Redis entirely, so the mobile app's OTPs evaporate on any restart or scale-out while the web app's survive. Two apps, one database, two different ideas about whether an OTP is durable.

### 2. The dead copy corrupts its own rate limiter

`src/routes/auth.ts` reuses the *same* `memOtp` Map and the *same* key (`otp:<phone>`) for two different record shapes:

```ts
// line 38-42: writes a RATE-LIMIT BUCKET
const key = `otp:${phone}`;
const bucket = (memOtp.get(key) as any) || { count: 0, firstAt: now };
…
memOtp.set(key, bucket as any);

// line 48: then overwrites the SAME key with the OTP record
await otpSet(phone, { code: otpCode, attempts: 0 }, 5 * 60);
```

So the rate-limit write is immediately clobbered by the OTP write — the bucket is destroyed by the very next statement. Rate limiting in this file **does not work at all**, and conversely a pending valid OTP would be replaced by a bucket on the next send request. (The file then reads the record back at `:74` expecting `{ code, attempts }` and would find `{ count, firstAt }` if timing reversed.)

This is worth flagging on its own because it is a perfect specimen of the pattern: the code *looks* like it rate-limits, has the comments claiming it rate-limits, and does not. No error is raised. Nothing fails visibly. An attacker hitting `/api/auth/send-otp` (were this module ever mounted) would face no limit.

### 3. The live mobile layer has no rate limit at all

`src/routes/mobile.ts:53` carries the comment:

```ts
// Rate limit by phone number: max 3 requests per 5 minutes.
```

followed by **no rate-limiting code whatsoever** — the next statement generates the OTP. The comment is a claim the code does not honor. Meanwhile the live web handler (`server.ts:164`) implements exactly this limit via `rateIncr`.

`mobile.ts` is **mounted** (`/api/v1`), so its `/auth/otp/send` endpoint genuinely accepts unlimited OTP requests per phone — each triggering a billable SMS via MeliPayamak. This is the finding most directly convertible into cost or abuse.

## Failure scenarios

- **SMS cost attack:** unlimited calls to `/api/v1/auth/otp/send` → unlimited MeliPayamak SMS dispatch, no 429. The web endpoint has the limit; the mobile endpoint, which serves the Flutter app that is presumably published, does not.
- **OTP invalidated by restart:** with `REDIS_URL` unset (the documented fallback, `server.ts:46-48` warns "using in-memory OTP") or on the mobile path, a restart or second instance invalidates every in-flight OTP. A user who requested a code and then the pod recycled gets "کد منقضی شده" for a code they hold correctly.
- **Clobbered records:** if `src/routes/auth.ts` is ever mounted, its key collision destroys either the OTP or the rate bucket depending on order.

## Likely origin

Three eras, three OTP systems. Era 2 wrote the Redis-backed `server.ts` version (`eaae268d`, "Redis OTP"). Era 3 copied it into `src/routes/auth.ts` and in doing so translated the rate limiter incorrectly — the original used a separate `rateIncr` helper with a distinct key namespace (`rate:<k>`), and the copy conflated the two keys into one. Era 4 wrote `mobile.ts` as a fresh Flutter adapter that chose its own in-memory store and carried the rate-limit comment over as decoration.

Each era was internally consistent. None knew about the others.

## Verification

1. Confirm `memOtpStore` is only used within `mobile.ts` (declared `:709`, used `:55`, `:81`, `:88`, `:93`, `:177`, `:182`) and never synced to Redis.
2. Confirm the `memOtp` key collision in `auth.ts` by reading lines 38–48 sequentially.
3. Confirm the live `server.ts` rate limit is the only one enforced: `rateIncr` is called only from `:164`.
4. Check whether `mobile.ts:177-182` (the `/auth/login` legacy path re-reading `memOtpStore`) shares the divergence.

## Suggested fix direction

One OTP service, one storage decision, one rate limiter — extracted to `src/lib/otp.ts` (or `src/services/`), used by `server.ts`, `mobile.ts`, and any future route layer. Concretely:

- Store: Redis when configured, memory otherwise, behind a single interface — what `server.ts` already implements. `mobile.ts` should call it instead of `memOtpStore`.
- Rate limit: separate key namespace (`rate:<phone>`), which is what `server.ts` already does correctly. Do not reuse the OTP key.
- Delete `src/routes/auth.ts`'s OTP section outright once F-02 is resolved — its key collision is not a bug to fix, it is evidence the copy should not exist.

Note the guard: an OTP rate limit must not prevent verification (only sending), and the mobile `verify` path correctly does not rate-limit attempt counting — that part is fine. The missing piece is purely on the send side.
