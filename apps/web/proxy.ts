// Renamed from middleware.ts in Next 16 (docs/kickoff/02-repo-structure.md).
// This is a cheap, cookie-presence gate only — it keeps a logged-out browser
// from even reaching the dashboard route's render. The actual session
// validity check (hash lookup, expiry, idle timeout, revocation) happens
// server-side in lib/session.ts on every protected page; this is defense in
// depth, not the authorization boundary.
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "./lib/session";

export function proxy(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/dashboard")) {
    const hasCookie = req.cookies.has(SESSION_COOKIE);
    if (!hasCookie) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
