"use client";

import { useActionState, useId, useState } from "react";
import { changePasswordAction } from "./actions";
import { PASSWORD_MIN_LENGTH, scorePassword, type PasswordState } from "./policy";
import styles from "./page.module.css";

const INITIAL: PasswordState = { error: null };

export default function ChangePasswordForm({ forced }: { forced: boolean }) {
  const [state, formAction, pending] = useActionState(changePasswordAction, INITIAL);
  const [pw, setPw] = useState("");
  const uid = useId();
  const s = scorePassword(pw);

  return (
    <form action={formAction} className={styles.form}>
      <div className={styles.field}>
        <label className={styles.label} htmlFor={`${uid}-cur`}>
          Current password
        </label>
        <input
          id={`${uid}-cur`}
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
          className={styles.input}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor={`${uid}-new`}>
          New password
        </label>
        <p className={styles.hint} id={`${uid}-new-hint`}>
          At least {PASSWORD_MIN_LENGTH} characters. A short phrase you&rsquo;ll remember — three or
          four unrelated words — beats a short complicated one.
        </p>
        <input
          id={`${uid}-new`}
          name="newPassword"
          type="password"
          required
          autoComplete="new-password"
          aria-describedby={`${uid}-new-hint ${uid}-meter`}
          className={styles.input}
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />
        <div className={styles.meter} id={`${uid}-meter`}>
          <div className={styles.meterTrack} aria-hidden="true">
            {[1, 2, 3].map((i) => (
              <span key={i} className={s.level >= i ? styles.meterOn : styles.meterOff} />
            ))}
          </div>
          <span className={styles.meterLabel} aria-live="polite">
            {pw ? s.label : ""}
          </span>
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor={`${uid}-confirm`}>
          Confirm new password
        </label>
        <input
          id={`${uid}-confirm`}
          name="confirmPassword"
          type="password"
          required
          autoComplete="new-password"
          className={styles.input}
        />
      </div>

      {state.error && (
        <p role="alert" className={styles.error}>
          {state.error}
        </p>
      )}

      <button type="submit" className={styles.submit}>
        {pending ? "Saving…" : "Save new password"}
      </button>

      {!forced && (
        <a className={styles.backLink} href="/dashboard">
          Back to the dashboard
        </a>
      )}
    </form>
  );
}
