import { prisma } from "../client";

export const staffUserRepo = {
  async findByEmail(email: string) {
    return prisma.staffUser.findUnique({ where: { email } });
  },
  async findById(id: string) {
    return prisma.staffUser.findUnique({ where: { id } });
  },
  async recordFailedLogin(id: string, failedLogins: number, lockedUntil: Date | null) {
    return prisma.staffUser.update({
      where: { id },
      data: { failedLogins, lockedUntil },
    });
  },
  async recordSuccessfulLogin(id: string) {
    return prisma.staffUser.update({
      where: { id },
      data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() },
    });
  },
};
