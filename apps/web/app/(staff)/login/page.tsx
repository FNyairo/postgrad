"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

export default function StaffLoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <main style={{ maxWidth: 360, margin: "4rem auto", fontFamily: "system-ui" }}>
      <h1>Staff login</h1>
      <form action={formAction} style={{ display: "grid", gap: "0.75rem" }}>
        <label>
          Email
          <input name="email" type="email" required autoComplete="username" />
        </label>
        <label>
          Password
          <input name="password" type="password" required autoComplete="current-password" />
        </label>
        {state.error && <p role="alert" style={{ color: "#B3261E" }}>{state.error}</p>}
        <button type="submit" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
      {/* TOTP step lands here once enrolment/verification is built. */}
    </main>
  );
}
