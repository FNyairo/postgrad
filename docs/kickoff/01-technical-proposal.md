# PGSTS — Technical Proposal

Phase 1 · 20 September 2026

Deployment analysis, version findings and open questions are in
`00-decision-record.md`. This document covers the stack itself and why each
piece was chosen given the cPanel constraint.

---

## 1. Stack

| Layer | Choice | Version | Why this one |
|---|---|---|---|
| Framework | Next.js | **16.3.x LTS** | 15 reaches EOL on 21 Oct 2026. See decision record §3.1. |
| Runtime | Node.js | **22 LTS min, 24 preferred** | Next 16 needs ≥ 20.9; Node 20 is EOL. |
| UI | React | 19.2 | Ships with Next 16. |
| Language | TypeScript | 5.x, `strict` | |
| Styling | Tailwind CSS v4 + shadcn/ui | | Tailwind v4's engine keeps the CSS budget reachable. shadcn is copied in, not a dependency, so unused primitives never reach the bundle. |
| Design tokens | Material Design 3 as CSS custom properties | | Dashboard only. The public pages use a lighter token set — MD3's full role system is more than a form needs. |
| Forms | React Hook Form + Zod | | One schema, imported by both the client island and the route handler. |
| Charts | Recharts, dynamically imported | | Staff routes only. Never in the student bundle. |
| ORM | Prisma | | Parameterised queries by construction. Migration tooling that survives a Postgres move. |
| Database | MySQL 8.0 / MariaDB 10.6+ | | Forced by cPanel. Schema avoids every Postgres-only Prisma feature. |
| Passwords | `@node-rs/argon2` (Argon2id) | m ≥ 19456 KiB, t ≥ 2, p = 1 | Native binding; the pure-JS alternatives are too slow at these parameters on shared hosting. |
| Sessions | Hand-rolled, database-backed | ~200 lines | See §2. |
| TOTP | `otplib` | | 30 s step, ±1 tolerance, SHA-1 for authenticator compatibility. |
| Validation | Zod | | |
| Rate limiting | MySQL table | | No Redis on cPanel. Redis adapter written but unused. |
| Email | Resend or Postmark behind a `Mailer` port | | See §3. |
| Testing | Vitest, Playwright, axe-core, k6 | | |
| CI | GitHub Actions | | Also the build machine — see decision record §5.2. |

---

## 2. Why hand-rolled sessions rather than an auth library

The master prompt suggests Lucia Auth or Auth.js v5. My recommendation is a
small session module of our own, and I want to be explicit that this is a
judgment call rather than an obvious answer.

What this system actually needs is narrow: create a session, look it up by
hashed id, rotate it on login, expire it on idle and absolute timeouts, revoke
it. There are no OAuth providers, no social login, no account linking, no JWT
refresh dance. That is roughly two hundred lines, it is easy to audit, and the
security-critical path is code we can read end to end.

Auth.js v5 brings an adapter layer, a provider abstraction and a callback system
we would use none of, and its database-session mode would still need custom work
to add the partial-session step that mandatory TOTP requires. Lucia's status as
a maintained library has been in flux, and I would rather not discover that at
month six. **I will confirm the current state of both before writing this
module** — if Lucia is healthy and its API still fits, it is a reasonable
alternative and I will say so.

The primitives come from well-maintained packages either way: `@node-rs/argon2`
for hashing, `otplib` for TOTP, and Node's own `crypto` for random bytes and
HMAC. What we write is the glue, not the cryptography.

---

## 3. Email

Phase 1 sends no bulk mail. It does send transactional mail — newsletter
confirmations, account lockout warnings, DSR acknowledgements — and §17 requires
a confirmation to arrive within sixty seconds.

**Do not use cPanel's built-in mail.** Shared hosting IP addresses carry poor
sending reputation, and mail from one will frequently land in spam at
institutional recipients. A double opt-in system whose confirmation emails do
not arrive is a system that collects nothing.

Use an API-based provider — Resend or Postmark — behind a `Mailer` interface so
the choice is reversible. Both deliver over HTTPS, which matters because some
shared hosts block outbound SMTP ports.

**Three deployment prerequisites**, none of which are code:

1. SPF, DKIM and DMARC records on the sending domain. Without them, delivery to
   institutional mail servers is unreliable regardless of provider.
2. A signed data processing agreement with whichever provider is chosen, and a
   record of where it stores data. Required under §9 and recorded in
   `docs/compliance/processors.md`.
3. A `From:` address on the department's own domain, not the provider's.

Because Passenger gives us no worker process, transactional mail sends inline
within the request. One message to an API takes well under a second. If the send
fails, the subscriber row is still written with `doubleOptInSentAt` null, and a
cron job retries it — the student or subscriber never sees a failure caused by a
transient provider outage.

---

## 4. Security implementation notes

Most of §8 carries over unchanged. Three items need adjustment for this
platform, and one is a correction.

**Content Security Policy.** Strict, nonce-based, generated per request in
`proxy.ts`. Next.js 16 runs `proxy.ts` on the Node runtime, so this works
without the Edge-runtime workarounds that Next 15 needed.

**HSTS and security headers on cPanel.** Set at the application layer in
`proxy.ts` rather than in `.htaccess`, so they are version-controlled and
travel with the code. `max-age=63072000; includeSubDomains; preload`, applied
only once HTTPS is confirmed working — a preload submission is very hard to
undo.

**CSRF.** Next.js Server Actions carry origin checks, but the `/api/v1/*` route
handlers do not. Double-submit cookie plus a per-form token on every mutating
route handler.

**Correction — IP hashing.** The spec's `SHA-256(IP + pepper)` is replaced by
`HMAC-SHA-256(key, IP)`. The IPv4 address space is 2³², which is exhaustively
enumerable in seconds, so the construction's security rests entirely on the
pepper staying secret. A keyed MAC is the right primitive for that job and
costs nothing to switch to. Same column, same purpose, stronger guarantee.

**Error monitoring.** Self-hosted GlitchTip with PII scrubbing, or nothing at
all. On shared hosting, self-hosting a monitoring service is impractical, so the
realistic Phase 1 answer is structured logs written to the application's own log
file with a global redaction list, plus alerting from the cron job that already
runs. Hosted Sentry is not an option here — it would put personal data in a
third-party processor that §10 forbids.

---

## 5. What I would still push back on

Three items from the master prompt that I think are worth reconsidering. None
are blockers, and I will build them as written if you disagree.

**k6 load test at 500 concurrent submissions.** This is a departmental register.
The realistic peak is perhaps forty students registering in the same hour at the
start of a semester. Testing 500 concurrent writes against shared hosting will
mostly measure the host's LVE limits and will likely get the account throttled
or suspended. I suggest 50 concurrent as the target, and reading the result as
a check on connection pooling rather than a capacity claim.

**Responsive screenshot gallery at six breakpoints.** Worth having, but it is a
maintenance burden that goes stale quickly. The Playwright visual-regression
assertions already catch layout breakage, and they fail loudly. I would generate
the gallery once at release rather than keep it current between releases.

**XLSX and PDF export in Phase 1.** CSV covers the actual need — it opens in
Excel and imports anywhere. XLSX adds a dependency, and PDF export of a wide
table is fiddly to get right and rarely what anyone wanted. I suggest CSV in
Phase 1, and adding the others if the coordinator asks for them once the system
is in use.

---

## 6. Build order for the vertical slice

Once the decision record's open questions are answered:

1. Scaffold, TypeScript strict, ESLint flat config, CI skeleton
2. Prisma schema, first MySQL migration, seed script with taxonomy suggestions
3. `packages/core` domain rules with unit tests, no database
4. Staff auth: Argon2id, database sessions, TOTP enrolment and verification
5. Public registration form, end to end, meeting the mobile budgets
6. Coordinator dashboard: table, search, filter, detail drawer, edit with reason
7. Chairperson token: issue, verify, revoke, log
8. CSV export, streamed and audited

At that point the system does its core job and can be demonstrated to the
department. Newsletter, compliance documents, PWA, full test suite and the
hardening pass follow in the master prompt's §18 order.
