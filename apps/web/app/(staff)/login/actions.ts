"use server";

import { redirect } from "next/navigation";
import { staffUserRepo } from "@pgsts/adapter-prisma";
import { argon2Hasher } from "@pgsts/adapter-argon2";
import { shouldLock, computeLockoutUntil, isLockedOut } from "@pgsts/core";
import { createStaffSession } from "../../../lib/session";

export interface LoginState {
  error: string | null;
}

// Deliberately vague error messages throughout — "incorrect email or
// password" whether the email doesn't exist, the password is wrong, or the
// account is locked (except the locked case, which is disclosed, since a
// locked account is not exploitable information the way "no such user" is).
export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const user = await staffUserRepo.findByEmail(email);
  if (!user || user.disabledAt) {
    // Constant-shape response even when there's no user to check against —
    // avoids a timing signal that would let an attacker enumerate emails.
    await argon2Hasher.verify("$argon2id$v=19$m=19456,t=2,p=1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", password).catch(() => {});
    return { error: "Incorrect email or password." };
  }

  if (isLockedOut(user.lockedUntil)) {
    return { error: "This account is temporarily locked. Try again later." };
  }

  const ok = await argon2Hasher.verify(user.passwordHash, password);
  if (!ok) {
    const failedLogins = user.failedLogins + 1;
    const lockedUntil = shouldLock(failedLogins) ? computeLockoutUntil() : null;
    await staffUserRepo.recordFailedLogin(user.id, failedLogins, lockedUntil);
    return { error: "Incorrect email or password." };
  }

  await staffUserRepo.recordSuccessfulLogin(user.id);

  // TOTP enrolment/verification (schema: totpEnabled, totpSecretEnc) is not
  // wired up yet — see docs/kickoff/01-technical-proposal.md build order
  // step 4. Sessions issued here are full sessions, not the partial-session
  // step mandatory TOTP will need. Do not treat this as finished 2FA.
  await createStaffSession(user.id);
  redirect("/dashboard");
}
