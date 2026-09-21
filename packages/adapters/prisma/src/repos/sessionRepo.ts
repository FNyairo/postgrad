import { prisma } from "../client";
import type { IssuedSession } from "@pgsts/core";

export const sessionRepo = {
  async create(userId: string, issued: IssuedSession, ipHash: string, userAgent: string | null) {
    return prisma.session.create({
      data: {
        id: issued.tokenHash,
        userId,
        expiresAt: issued.expiresAt,
        ipHash,
        userAgent,
      },
    });
  },
  async findById(tokenHash: string) {
    return prisma.session.findUnique({ where: { id: tokenHash } });
  },
  async touch(tokenHash: string) {
    return prisma.session.update({ where: { id: tokenHash }, data: { lastSeenAt: new Date() } });
  },
  async revoke(tokenHash: string) {
    return prisma.session.update({ where: { id: tokenHash }, data: { revokedAt: new Date() } });
  },
};
