/**
 * Password policy, kept out of actions.ts because that file is "use server"
 * and may only export async functions — a constant or a sync helper exported
 * from there fails the build (or, worse, arrives as undefined at runtime).
 */

export type PasswordState = { error: string | null };

export const PASSWORD_MIN_LENGTH = 12;

/**
 * Strength check, deliberately length-first.
 *
 * Composition rules ("one upper, one digit, one symbol") push people towards
 * Passw0rd! and are weaker in practice than simply demanding length, so the
 * floor here is 12 characters with a nudge towards a passphrase. The only
 * hard extra rules are ones that catch genuinely bad choices.
 *
 * Returns the problem to show the user, or null if the password is fine.
 */
export function passwordProblem(password: string, email: string, name: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Use at least ${PASSWORD_MIN_LENGTH} characters. A short phrase you'll remember works well.`;
  }
  if (password.length > 200) return "That password is too long.";

  const lower = password.toLowerCase();
  const localPart = email.split("@")[0]?.toLowerCase() ?? "";
  if (localPart.length > 2 && lower.includes(localPart)) {
    return "Please don't include your email address in your password.";
  }
  for (const part of name.toLowerCase().split(/\s+/)) {
    if (part.length > 2 && lower.includes(part)) {
      return "Please don't include your name in your password.";
    }
  }
  if (/^(.)\1+$/.test(password)) return "Please choose something less predictable.";
  if (new Set(password).size < 5) return "Please use a wider mix of characters.";

  return null;
}

/**
 * Score for the strength meter. Rewards what actually makes a password hard
 * to guess — length and variety — rather than ticking off character classes.
 */
export function scorePassword(pw: string): { level: 0 | 1 | 2 | 3; label: string } {
  if (pw.length < PASSWORD_MIN_LENGTH) return { level: 0, label: "Too short" };
  let points = 0;
  if (pw.length >= 16) points++;
  if (pw.length >= 24) points++;
  if (new Set(pw).size >= 12) points++;
  if (/\s/.test(pw)) points++; // a passphrase
  if (points >= 3) return { level: 3, label: "Strong" };
  if (points >= 1) return { level: 2, label: "Good" };
  return { level: 1, label: "Acceptable" };
}
