import { hash, verify } from "@node-rs/argon2";
import type { Hasher } from "@pgsts/core";

// Argon2id, m >= 19456 KiB, t >= 2, p = 1 — the parameters
// 01-technical-proposal.md §1 specifies for shared hosting. @node-rs/argon2's
// defaults already meet this (m=19456, t=2, p=1); pinned explicitly here so a
// future default change in the package doesn't silently weaken it.
const PARAMS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

export const argon2Hasher: Hasher = {
  async hash(plaintext: string): Promise<string> {
    return hash(plaintext, PARAMS);
  },
  async verify(hashValue: string, plaintext: string): Promise<boolean> {
    return verify(hashValue, plaintext);
  },
};
