// The interfaces adapters implement. Nothing in packages/core imports a
// concrete driver (Prisma, Redis, an email SDK) — only these shapes.
// See docs/kickoff/02-repo-structure.md, "Why this shape".

export interface Clock {
  now(): Date;
}

export interface Hasher {
  hash(plaintext: string): Promise<string>;
  verify(hash: string, plaintext: string): Promise<boolean>;
}

export interface Mailer {
  send(input: { to: string; subject: string; html: string }): Promise<void>;
}

export interface RateLimiter {
  consume(key: string, cost?: number): Promise<{ allowed: boolean; remaining: number }>;
}

// Repo is intentionally left unspecified here — each aggregate (student,
// session, share-token, ...) gets its own narrow repository interface next
// to the domain module that owns it, rather than one god interface.
