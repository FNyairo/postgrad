"use server";

import { redirect } from "next/navigation";
import { argon2Hasher } from "@pgsts/adapter-argon2";
import { staffUserRepo } from "@pgsts/adapter-prisma";
import { getCurrentStaffUser } from "@/lib/session";
import { passwordProblem, type PasswordState } from "./policy";

// NOTE: this module is "use server" — it may export async functions and
// nothing else. PASSWORD_MIN_LENGTH, passwordProblem and scorePassword
// therefore live in ./policy.ts.

export async function changePasswordAction(
  _prev: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  const user = await getCurrentStaffUser();
  if (!user) redirect("/login");

  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (!current || !next || !confirm) return { error: "Please fill in all three fields." };
  if (next !== confirm) return { error: "The two new passwords don't match." };

  const ok = await argon2Hasher.verify(user.passwordHash, current);
  if (!ok) return { error: "Your current password is incorrect." };

  if (next === current) return { error: "Please choose a different password from your current one." };

  const problem = passwordProblem(next, user.email, user.name);
  if (problem) return { error: problem };

  // Writes the hash and clears mustChangePassword together — see
  // staffUserRepo.setPassword for why those must not be separate writes.
  await staffUserRepo.setPassword(user.id, await argon2Hasher.hash(next));
  redirect("/dashboard");
}
