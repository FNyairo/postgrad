import { NextResponse, type NextRequest } from "next/server";
import { studentRegistrationSchema } from "@pgsts/schema";
import { DuplicateRegistrationError } from "@pgsts/adapter-prisma";
import { registerStudent } from "@/lib/registerStudent";

// Rate limiting (RateLimit table / MySQL, per 01-technical-proposal.md §1)
// and CSRF (double-submit cookie, per §4) are not wired into this handler
// yet — both are explicitly called out in the technical proposal as required
// on every mutating /api/v1/* route before this is production-safe.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = studentRegistrationSchema.safeParse(body);
  if (!parsed.success) {
    // TypeScript narrows `parsed` to the failure branch here — it has no
    // `.data` at all, only `.error`. (Caught by npm run typecheck, not by
    // `next build`'s narrower type-check scope — worth running both.)
    return NextResponse.json({ error: "Validation failed.", issues: parsed.error.flatten() }, { status: 422 });
  }

  const input = parsed.data;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  try {
    const student = await registerStudent(input, ip);

    return NextResponse.json({ id: student.id }, { status: 201 });
  } catch (err) {
    if (err instanceof DuplicateRegistrationError) {
      // F7: identical response whether it was regNumber or email that
      // collided — do not let the client distinguish the two.
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
