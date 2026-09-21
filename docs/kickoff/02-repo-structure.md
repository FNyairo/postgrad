# PGSTS — Repository Structure

Single Next.js 16 application. Domain logic lives in `packages/core`, which has
no Next.js imports and no database driver imports — it depends on interfaces
only. That is what keeps the cPanel decision reversible: moving to a VPS, or
swapping MySQL for Postgres and the database rate limiter for Redis, means
writing new adapters, not touching business rules.

```
pgsts/
├── apps/
│   └── web/                          # the only deployable
│       ├── app/
│       │   ├── (public)/
│       │   │   ├── page.tsx                  # landing page
│       │   │   ├── register/page.tsx         # student form (prerendered shell)
│       │   │   ├── register/confirm/page.tsx # success screen
│       │   │   ├── privacy/page.tsx
│       │   │   ├── data-request/page.tsx     # DSR intake
│       │   │   └── newsletter/
│       │   │       ├── confirm/page.tsx
│       │   │       └── unsubscribe/page.tsx
│       │   ├── (staff)/
│       │   │   ├── login/page.tsx
│       │   │   ├── login/totp/page.tsx
│       │   │   └── dashboard/
│       │   │       ├── page.tsx              # KPIs + charts
│       │   │       ├── students/page.tsx     # table / card list
│       │   │       ├── students/[id]/page.tsx
│       │   │       ├── requests/page.tsx     # DSR queue with SLA clocks
│       │   │       ├── share-links/page.tsx
│       │   │       └── audit/page.tsx
│       │   ├── view/[token]/page.tsx         # chairperson read-only
│       │   ├── api/v1/
│       │   │   ├── students/route.ts
│       │   │   ├── newsletter/
│       │   │   │   ├── subscribe/route.ts
│       │   │   │   ├── confirm/route.ts
│       │   │   │   └── unsubscribe/route.ts
│       │   │   ├── dsr/route.ts
│       │   │   ├── export/route.ts           # streamed, never written to disk
│       │   │   └── cron/[job]/route.ts       # token-auth'd; see ops/cron.md
│       │   ├── healthz/route.ts
│       │   ├── readyz/route.ts
│       │   └── layout.tsx
│       ├── proxy.ts                  # was middleware.ts — renamed in Next 16
│       ├── components/
│       │   ├── form/                 # the registration wizard
│       │   ├── dashboard/
│       │   ├── charts/               # dynamically imported, never in the
│       │   │                         # student bundle
│       │   └── ui/                   # shadcn primitives
│       ├── styles/
│       │   └── tokens.css            # Material Design 3 roles as CSS vars
│       ├── public/
│       │   ├── manifest.webmanifest
│       │   └── icons/                # 192, 512, maskable
│       └── next.config.ts            # output: 'standalone'
│
├── packages/
│   ├── core/                         # no next/*, no @prisma/client imports
│   │   ├── student/                  # registration rules, normalisation,
│   │   │                             # retention calculation
│   │   ├── auth/                     # password, TOTP, session rules
│   │   ├── token/                    # share-token issue / verify / revoke
│   │   ├── newsletter/               # double opt-in state machine
│   │   ├── dsr/                      # statutory SLA computation
│   │   ├── audit/
│   │   └── ports/                    # the interfaces adapters implement:
│   │                                 # Repo, RateLimiter, Mailer, Clock, Hasher
│   ├── schema/                       # Zod schemas shared by client and server
│   ├── adapters/
│   │   ├── prisma/                   # Repo implementations
│   │   ├── ratelimit-db/             # the cPanel path
│   │   ├── ratelimit-redis/          # the VPS path, written but unused for now
│   │   └── mailer-resend/            # provider-agnostic behind Mailer
│   └── config/
│       └── institution.ts            # every department-specific string
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts                       # first coordinator + taxonomy suggestions
│
├── docs/
│   ├── kickoff/                      # this pack
│   ├── compliance/                   # privacy notice, DPIA, processors, DSR
│   ├── runbooks/                     # incident, breach, restore, rotate, revoke
│   ├── schema/phase2.md              # the five deferred tables (FIX F4)
│   ├── testing/mobile-matrix.md
│   ├── copy/landing-page.md
│   └── deploy/
│       ├── cpanel.md                 # Path A — chosen
│       └── vps.md                    # Path B — fallback
│
├── .github/workflows/
│   ├── ci.yml                        # lint, typecheck, test, migration dry-run
│   ├── lighthouse.yml                # mobile budgets, fails the build
│   └── deploy-cpanel.yml             # builds standalone, ships the artifact
│
├── .env.example
└── Makefile                          # dev, test, migrate, seed, deploy
```

## Why this shape

**One deployable.** Passenger starts one process. A second API process would need
a second Node.js App entry, its own subdomain or a reverse-proxy rule, and its
own env var set — on shared hosting that is a lot of moving parts for no benefit
at this scale.

**`packages/core` has no framework imports.** Domain tests run in milliseconds
with no database and no Next.js runtime. It also means the retention rule, the
normalisation logic and the token lifecycle can be reviewed by someone who does
not know Next.js — which matters if this is ever audited.

**`ratelimit-redis` is written now and left unused.** It costs an hour and it
makes the VPS migration a one-line adapter swap instead of a refactor under
pressure.

**`config/institution.ts` centralises every department-specific string** —
names, the DPO contact, the subdomain, retention periods, programme durations.
Nothing institution-specific is hard-coded in a component. Translation and
handover both become tractable.

**Charts are dynamically imported.** Recharts is large. It must never appear in
the student form's bundle, which is held to 120 KB gzipped.
