"use client";

import { useActionState, useId } from "react";
import { loginAction, type LoginState } from "./actions";
import styles from "./page.module.css";

const initialState: LoginState = { error: null };

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const uid = useId();

  return (
    <form action={formAction} className={styles.form}>
      <div className={styles.field}>
        <label className={styles.label} htmlFor={`${uid}-email`}>
          Email
        </label>
        <input
          id={`${uid}-email`}
          name="email"
          type="email"
          required
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          inputMode="email"
          className={styles.input}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor={`${uid}-password`}>
          Password
        </label>
        <input
          id={`${uid}-password`}
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className={styles.input}
        />
      </div>

      {state.error && (
        <p role="alert" className={styles.error}>
          {state.error}
        </p>
      )}

      <button type="submit" className={styles.submit}>
        {pending ? "Signing in…" : "Sign in"}
      </button>

      {/* Second factor lands here once TOTP enrolment is built — deferred by
          request. Until then this is a single-factor login; the forced
          password change on first sign-in is what stops a seeded temporary
          password living on indefinitely. */}
    </form>
  );
}
