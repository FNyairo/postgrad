# PGSTS — Authentication and Token Flows

Three actors, three completely separate paths. A student never receives a
session of any kind; the public form is stateless apart from rate limiting.

---

## 1. Staff login

```
  ┌─────────┐
  │ /login  │  email + password
  └────┬────┘
       │
       ▼
  ┌─────────────────────────────────────────────────┐
  │ Look up StaffUser by email                      │
  │                                                 │
  │ ALWAYS run Argon2id, even when no user exists,  │
  │ against a fixed dummy hash. Otherwise response  │
  │ time reveals which addresses are staff.         │
  └────┬────────────────────────────────────────────┘
       │
       ├─ disabledAt set ──────────────► generic failure
       ├─ lockedUntil in future ───────► generic failure
       ├─ hash mismatch ───────────────► failedLogins++, backoff, generic failure
       │                                 (5 failures → lock + email the user)
       ▼  match
  ┌─────────────────────────────────────────────────┐
  │ Create PARTIAL session                          │
  │   totpVerified = false                          │
  │   expires in 5 minutes                          │
  │   grants access to /login/totp and nothing else │
  └────┬────────────────────────────────────────────┘
       │
       ▼
  ┌──────────────┐
  │ /login/totp  │  6-digit code, or a recovery code
  └────┬─────────┘
       │
       ├─ TOTP valid (±1 step) ────────┐
       ├─ recovery code valid ─────────┤  mark that code usedAt,
       │    (single use, Argon2id)     │  warn if ≤2 remain
       │                               │
       ▼  invalid                      ▼
   failedLogins++            ┌──────────────────────────────────┐
   generic failure           │ ROTATE: delete partial session,  │
                             │ issue a full one                 │
                             │   id = 32 random bytes           │
                             │   stored as SHA-256(id)          │
                             │   cookie: httpOnly, Secure,      │
                             │           SameSite=Lax, __Host-  │
                             │   absolute expiry  12h           │
                             │   idle expiry      30m           │
                             │ reset failedLogins, set lastLogin│
                             │ audit: auth.login                │
                             └──────────┬───────────────────────┘
                                        │
                                        ▼
                             mustChangePassword ? /account/password
                                                : /dashboard
```

**Why the session id is hashed at rest.** A database read — a backup leak, an
SQL injection in some future feature, a curious host administrator on shared
infrastructure — yields hashes, not usable cookies. The same reasoning applies
to share tokens and recovery codes.

**Session validation on every request** happens in `proxy.ts`, which in
Next.js 16 runs on the Node runtime, so it can query MySQL directly:

```
cookie → SHA-256 → Session lookup
  ├─ not found / revokedAt set        → 401, clear cookie
  ├─ expiresAt passed                 → 401, delete row
  ├─ lastSeenAt older than idle limit → 401, delete row
  └─ valid → refresh lastSeenAt (throttled: at most once a minute,
             so a busy dashboard does not write on every request)
```

**TOTP details.** 30-second step, ±1 step tolerance, SHA-1 for authenticator
compatibility. The secret is AES-256-GCM encrypted before it reaches MySQL
(see decision record Q2 — this is the only at-rest protection shared hosting
allows). Enrolment shows a QR code once and ten recovery codes once, and the
account cannot reach the dashboard until enrolment completes.

---

## 2. Chairperson share token

```
COORDINATOR ISSUES
  │
  ├─ generate 32 random bytes → base64url  (the raw token; 43 chars)
  ├─ store SHA-256(raw) as tokenHash       (raw is never persisted)
  ├─ set label, expiresAt (default +30d), maxUses?, allowExport (default false)
  ├─ audit: token.create
  │
  └─► show the full URL EXACTLY ONCE, with a copy button
      https://pgst.<domain>/view/<raw>
      "This link will not be shown again. Copy it now."


CHAIRPERSON OPENS /view/<raw>
  │
  ▼
  SHA-256(raw) → ShareToken lookup
  ├─ no match                → 404 (not 403 — a 403 confirms the token format
  │                            is right, which helps an attacker)
  ├─ revokedAt set           → 403 "This link has been revoked."
  ├─ expiresAt passed        → 403 "This link expired on <date>."
  ├─ maxUses reached         → 403 "This link has reached its access limit."
  └─ valid
       ├─ useCount++, lastUsedAt = now
       ├─ audit: token.access  { tokenId, ipHash, userAgent }
       └─ render read-only register
            · no session cookie is ever set
            · every request re-verifies the token from the URL
            · export button rendered only if allowExport
            · "Read-only" badge always visible
```

**Revocation is immediate** because there is no session to outlive it — the
token is checked from the URL on every single request. Rotation issues a new
token and revokes the old one in one transaction.

**The 60-second auto-refresh in §12.4** is worth one adjustment. As specified it
polls indefinitely on a phone, burning battery and mobile data, and gives an
attacker who has the link a free liveness signal. Proposed instead:

- poll every 120 seconds, not 60
- pause entirely when the tab is hidden (`visibilitychange`)
- use `ETag` / `If-None-Match` so an unchanged register returns 304 with no body
- stop after 30 minutes of no interaction, with a "Resume live updates" button

Same usefulness, a fraction of the traffic. Flagging rather than assuming —
tell me if you want the literal 60 seconds.

---

## 3. Student — no authentication at all

```
  /register  → form (prerendered shell, no session, no cookie)
      │
      ▼
  POST /api/v1/students
      ├─ honeypot field populated?        → 200 OK, silently discard
      ├─ rate limit: 5/hour, 20/day per IP; 5/day per email (hashed buckets)
      ├─ Zod validation (same schema the client ran)
      ├─ normalise programme / degree / stage against Taxonomy
      ├─ compute retentionUntil + retentionBasis
      ├─ INSERT — unique violation on regNumber OR email returns the SAME
      │   message either way, so the endpoint cannot be used to test whether
      │   an address is already registered
      ├─ audit: student.create  { ipHash, noticeVersion }
      └─ 201 → /register/confirm
```

The confirmation screen shows only the fixed message. It does not echo the
submitted values, does not include a record id, and does not link anywhere that
lists students. There is no student-facing read path anywhere in the system, so
there is no IDOR surface to get wrong.

---

## 4. Rate-limit buckets

No Redis on cPanel, so these are rows in `RateLimit` keyed by
`HMAC(key, identifier + ":" + endpoint)` in a fixed window, purged by cron.

| Endpoint | Per IP | Per identity |
|---|---|---|
| `POST /api/v1/students` | 5/h, 20/d | 5/d per email |
| `POST /api/v1/newsletter/subscribe` | 5/h | 3/d per email |
| `POST /login` | 10/h | 5 failures → account lock |
| `GET /view/<token>` | 60/h | `maxUses` on the token itself |
| `GET /api/v1/export` | 10/h | per session |
| `POST /api/v1/dsr` | 3/h | 3/d per email |

Identifiers are hashed before they become bucket keys, so the rate-limit table
never holds a raw IP or a raw email address.
