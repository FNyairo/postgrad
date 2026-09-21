import { PrismaClient } from "@prisma/client";

// One client per process, reused across requests. Passenger keeps the
// process alive between requests, so a client created at import time is
// correct here (not the serverless "create per invocation" pattern).
declare global {
  // eslint-disable-next-line no-var
  var __pgstsPrisma: PrismaClient | undefined;
}

export const prisma: PrismaClient = globalThis.__pgstsPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__pgstsPrisma = prisma;
}
