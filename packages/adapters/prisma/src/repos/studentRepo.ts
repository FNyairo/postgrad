import { Prisma } from "@prisma/client";
import { prisma } from "../client";

// F7 (spec fix): duplicate regNumber and duplicate email must fail
// identically, so the error response can never be used to enumerate which
// one collided. This repo throws one DuplicateRegistrationError either way
// — the route handler must not inspect the underlying constraint.
export class DuplicateRegistrationError extends Error {
  constructor() {
    super("A record with this registration number or email already exists.");
    this.name = "DuplicateRegistrationError";
  }
}

export const studentRepo = {
  async create(data: Prisma.StudentUncheckedCreateInput) {
    try {
      return await prisma.student.create({ data });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new DuplicateRegistrationError();
      }
      throw err;
    }
  },
  async list(params: { skip?: number; take?: number } = {}) {
    return prisma.student.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      skip: params.skip,
      take: params.take ?? 50,
    });
  },
  async count() {
    return prisma.student.count({ where: { deletedAt: null } });
  },
};
