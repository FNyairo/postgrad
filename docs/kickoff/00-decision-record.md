# PGSTS — Kickoff Decision Record

**Postgraduate Student Tracking System, Department of Education**
Phase 1 · Version 0.1 · 20 September 2026

This document records what has been decided, what changed from the master prompt and why, and what still needs a decision from you or the department before code is written.

---

## 1. Decisions taken

| # | Decision | Chosen | Recorded |
|---|----------|--------|----------|
| D1 | Deployment target | cPanel shared hosting (Node.js App / Passenger), MySQL | You, 18 Sep 2026 |
| D2 | Architecture | Single Next.js application; domain logic isolated in `packages/core` | You, 18 Sep 2026 |
| D3 | Sequencing | Kickoff pack → working vertical slice → hardening | You, 18 Sep 2026 |
| D4 | Spec fixes to apply | Rectification gap, retention date, free-text/filter conflict, drop dead Phase-2 tables | You, 18 Sep 2026 |
| D5 | Framework version | Next.js 16 LTS, not 15 | This document, §3.1 |
| D6 | Node.js version | 22 LTS minimum, 24 preferred | This document, §3.1 |

---

## 2. What changed from the master prompt, and why

### 2.1 Applied without further sign-off (you approved these)

**F1 — Coordinator gains edit and soft-delete rights.**
§2.4 made the coordinator read-only and students unable to edit, so no one could correct a typo. That collides with the rectification duty in §9. The coordinator can now edit and soft-delete, behind a mandatory reason, with before/after values written to the audit log. Students still cannot see or edit anything.

**F2 — Retention became computable.**
`retentionUntil` was defined as "graduation + 5 years" with no graduation date collected. It is now derived from programme duration at submission and recalculated from `graduatedAt` when the coordinator records an actual graduation. The rule that produced each value is stored in `retentionBasis`, so a regulator can see the reasoning.

**F3 — Key fields are now normalised as well as free.**
§2.1 required free text; §2.2 required filtering and charts on the same fields. Students now get a combobox with existing values as suggestions plus unrestricted free text. Both the raw input and a normalised slug are stored. Nothing blocks submission, and the filters actually work.

**F4 — Phase-2 placeholder tables dropped.**
`Proposal`, `Document`, `ProgressUpdate`, `SupervisorAssignment`, `DefenceMilestone` are documented as an additive design in `docs/schema/phase2.md` rather than created empty. `Student.id` is a stable cuid, so all five attach later without touching Phase 1 tables.

### 2.2 Applied as technical corrections (low risk, no policy implication)

**F5 — Recovery codes get their own table.**
The spec's `recoveryCodes String[]` is a PostgreSQL-only Prisma type and will not migrate to MySQL. It also cannot track which codes have been spent, though §5.3 requires them to be single-use. They are now a `RecoveryCode` table with one hashed row per code and a `usedAt` column.

**F6 — IP hashing uses HMAC, not plain SHA-256.**
The spec says `SHA-256(IP + pepper)`. The IPv4 space is small enough to enumerate exhaustively, so that construction protects the IP only for as long as the pepper stays secret, and plain concatenation has weaker security semantics than a keyed MAC. Changed to `HMAC-SHA-256(key, IP)`. Same column width, same purpose, better guarantee.

**F7 — Duplicate submissions fail identically whichever field collides.**
`regNumber` and `email` are both unique. Both return the same message, so the form cannot be used to test whether a given email is already registered.

### 2.3 Raised for your decision — NOT yet applied

**Q1 — The lawful basis for the student register is probably wrong.** *(see §4.1)*

**Q2 — "Encrypted at rest" cannot be honestly claimed on shared hosting.** *(see §4.2)*

---

## 3. Version findings that force a change

### 3.1 Next.js 15 is one month from end of life

The master prompt specifies "Next.js 15+". Next.js 15 reaches end of life on **21 October 2026** — about four weeks from today. Building a new system on it would mean launching on an unsupported framework, which is hard to defend in a security review for a system holding personal data.

- Latest stable: **Next.js 16.3.5** (11 September 2026)
- Next.js 16 is the current LTS line (released 22 October 2025)
- Next.js 16 requires **Node.js ≥ 20.9**; Node.js 18 is unsupported

Node.js 20 itself reached end of life on **30 April 2026**. So the practical floor is **Node 22** (security support to April 2027), and **Node 24** (security support to April 2028) is the better target. Node 26 became the upcoming LTS in May 2026.

This matters directly for D1, because cPanel hosts are commonly a version or two behind. See §5.

### 3.2 Next.js 16 changes that affect this build

| Change | Effect here |
|---|---|
| `middleware.ts` renamed to `proxy.ts`; Node runtime only, no Edge | Security headers, CSP nonces and session checks move to `proxy.ts`. Node-only is fine — we need Node APIs for DB session lookups anyway. |
| Synchronous `cookies()`, `headers()`, `params`, `searchParams` fully removed | All request-time access is `await`ed from the start. No legacy pattern to unwind later. |
| `serverRuntimeConfig` / `publicRuntimeConfig` removed | Config comes from env vars. On cPanel these are set in the Node.js App UI, so we use `connection()` before reading `process.env` to guarantee runtime rather than build-time reads. This is load-bearing for the chosen deployment. |
| Turbopack is the default builder | Faster, but more memory-hungry. Reinforces the "never build on the host" rule in §5.3. |
| `next lint` removed; `next build` no longer lints | Linting becomes an explicit CI step. |
| `revalidateTag` requires a `cacheLife` argument | Minor; affects the dashboard's cache invalidation. |
| Parallel route slots require `default.js` | Affects the dashboard's detail drawer if built as a parallel route. |
| React 19.2 | `useEffectEvent` and `<Activity>` are available; neither is required. |

---

## 4. Open questions requiring your decision

### 4.1 Q1 — Lawful basis for the student register

**This is the most consequential item in this document.**

§9 of the master prompt assigns **consent** as the lawful basis for the student form, with legitimate interest for record-keeping. I think consent is the wrong basis here, for two reasons.

*It probably is not valid consent.* Regulation 4(4) of the Data Protection (General) Regulations 2021 requires consent to be freely given and says it cannot be bundled with non-negotiable terms. A postgraduate student asked by their own department to register is not in a realistic position to decline. Your own §3.2 already senses this tension — it instructs that the copy must not imply that non-submission blocks graduation.

*It breaks operationally.* Consent is withdrawable by definition. If a student withdraws it, the department must stop processing and delete — but it still needs an accurate register of its own postgraduate students. You would be legally obliged to delete a record you are academically obliged to keep.

**Recommendation:**

| Processing | Proposed basis |
|---|---|
| Core student register | Public interest / legitimate interests of the department, with a clear collection notice under §29 rather than a consent checkbox |
| Newsletter and alumni updates | Consent, opt-in, double opt-in, freely withdrawable — Regulation 15(1)(c) requires opt-in for direct marketing |

The form would keep a mandatory, timestamped, version-tracked **acknowledgement** ("I have read the Privacy Notice") instead of a consent checkbox. An acknowledgement is not consent, so it preserves your audit trail without mislabelling the basis. The database columns barely change — `consentGivenAt` becomes `noticeAcknowledgedAt`.

**I have not applied this.** It is a legal determination for the department and its Data Protection Officer, not a developer's call. If you would rather keep consent as specified, say so and I will build it exactly as written — the schema supports either.

### 4.2 Q2 — The honest limit of "encrypted at rest"

§9 promises "Postgres TDE + column-level for TOTP secret at rest" and §3.3 tells students "Data is encrypted in transit (TLS 1.3) and at rest."

On cPanel shared hosting there is no transparent data encryption and you do not control the disk. What we *can* do is encrypt specific sensitive columns in the application with AES-256-GCM before they reach MySQL — the TOTP secrets and recovery codes, at minimum.

That is meaningfully weaker than full encryption at rest, and the public copy must not overclaim. I propose the Trust Panel says something true instead:

> Your data is encrypted in transit using TLS 1.3. Sensitive security credentials are encrypted in our database. Access is restricted to the Postgraduate Coordinator and the Chairperson, and every access is logged.

It is less impressive and it is accurate. Overclaiming in a privacy notice is itself a compliance problem, and this one would be trivially falsifiable by anyone who asked where the system is hosted.

**Decision needed:** accept the honest wording, or move to a VPS where full-disk and database-level encryption are genuinely available and the original claim becomes true.

### 4.3 Q3 — Details I need before writing the copy

Placeholders will be used until you supply these, all in one config file (`config/institution.ts`):

- Department and university legal names, as they should appear in a privacy notice
- The subdomain the system will live on
- DPO name and contact address
- Whether the department is already registered with the ODPC as a data controller
- Typical programme durations, for the retention calculation in F2
- Whether Kiswahili translation is in scope for Phase 1 or deferred

---

## 5. Deployment reality check — read before the build starts

You chose cPanel, which is a reasonable call on cost and familiarity. I will build for it. But the evidence on Next.js 16 specifically is worse than the master prompt assumes, and you should know the failure modes before rather than after.

### 5.1 The four real risks

1. **Node version ceiling.** Next.js 16 needs ≥ 20.9. Many cPanel Node.js Selector installations top out around 20–22, and Node 20 is already end-of-life. If your host cannot offer Node 22, this system cannot be built securely on it.
2. **Building on the host will fail.** `next build` under Turbopack is memory-hungry, and shared hosting kills processes that exceed their account limit, returning 503. Multiple hosting guides specifically flag Next.js builds as impractical on shared cPanel.
3. **No persistent background workers.** Passenger owns the process lifecycle; PM2, forever and BullMQ workers cannot run. The master prompt's §5.2 BullMQ design does not survive contact with this platform.
4. **No Redis, usually.** Sessions, rate limiting and token revocation all fall back to the database.

### 5.2 Mitigations, which are the actual design

| Risk | Mitigation |
|---|---|
| Build failure | Never build on the host. GitHub Actions builds with `output: 'standalone'`, uploads the artifact, and deploys it. The host only ever runs a prebuilt server. |
| No workers | Transactional email sends inline within the request — it is one message, and Resend or Postmark returns in well under a second. Scheduled work (retention deletion, purging unconfirmed subscribers, audit flush) runs from cPanel cron hitting a token-authenticated internal endpoint. |
| No Redis | MySQL-backed sessions, rate limits and revocation. At a few hundred students and a handful of staff this is comfortably adequate. A `RateLimit` table with a composite unique key and a cron purge replaces Redis entirely. |
| Cold starts | The student form and landing page are prerendered, so a Passenger cold start does not blow the LCP budget. Only the first staff dashboard hit pays for it. |
| Host-controlled backups | Own nightly `mysqldump`, encrypted with age or gpg, pushed off-site. Not reliant on the host's backup policy. |

### 5.3 Host capability checklist — please run this before I write the auth module

Ten minutes in cPanel and a support ticket will answer all of these. The answers change how sessions and rate limiting are implemented, so I would rather know now than refactor later.

- [ ] Node.js Selector present, and which versions it offers — **need ≥ 22**
- [ ] Custom environment variables settable in the Node.js App UI — **required**
- [ ] Cron jobs available, and the minimum interval — **required**
- [ ] SSH access — **required for deploy and for the backup cron**
- [ ] MySQL 8.0 or MariaDB, and which version — Prisma behaves differently on each
- [ ] Per-account memory and entry-process limits (LVE)
- [ ] Passenger idle timeout, and whether long-running processes are permitted
- [ ] Outbound HTTPS to an email API permitted
- [ ] Redis add-on available — optional, but worth asking
- [ ] AutoSSL covers subdomains

**Decision gate.** If the host cannot offer Node ≥ 22, or cannot set custom environment variables, or has no cron, then cPanel is not viable for this system and I will say so plainly rather than build something that fails its own §8. The fallback is a small VPS at roughly €5 per month, which is a modest sum against the risk of a personal-data system running on an end-of-life runtime.

Everything is written behind a thin platform layer either way, so a move later is a configuration change and a migration, not a rewrite.

---

## 6. What happens next

Once you have confirmed Q1 and Q2 and run the §5.3 checklist:

1. Monorepo scaffold, TypeScript strict, ESLint flat config, CI
2. Prisma schema and first migration against MySQL
3. Staff auth — Argon2id, database sessions, TOTP
4. Public registration form end to end
5. Coordinator dashboard — table, search, filter, detail
6. Chairperson token system

That is the vertical slice. Newsletter, PWA, compliance documents, tests and the hardening pass follow, in the master prompt's §18 order.

---

## Sources

- [Next.js release and support timeline — endoflife.date](https://endoflife.date/nextjs)
- [Upgrading to Next.js 16 — official guide](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [Node.js release and EOL timeline — endoflife.date](https://endoflife.date/nodejs)
- [Data Protection (General) Regulations, 2021 — ODPC](https://www.odpc.go.ke/wp-content/uploads/2024/03/THE-DATA-PROTECTION-GENERAL-REGULATIONS-2021-1.pdf)
- [The Data Protection Act No. 24 of 2019](https://kentrade.go.ke/wp-content/uploads/2022/09/Data-Protection-Act-1.pdf)
- [How to host Node.js on cPanel, 2026 guide](https://h-haboubi.com/blog/server/host-node-js-on-cpanel/)
