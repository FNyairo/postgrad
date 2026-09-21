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

  /**
   * Sets a new password hash and clears the must-change flag in one write —
   * the two must never diverge, or an account either keeps prompting after a
   * successful change or stops prompting without one.
   */
  async setPassword(id: string, passwordHash: string) {
    return prisma.staffUser.update({
      where: { id },
      data: { passwordHash, mustChangePassword: false },
    });
  },
};
