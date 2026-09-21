"use client";

import { useActionState, useEffect, useId, useMemo, useRef, useState } from "react";
import { institution, registration, programmeDegreeLevel } from "@pgsts/config";
import { submitRegistration } from "./actions";
import {
  FIELD_LABELS,
  FIELD_NAMES,
  FIELD_SECTION,
  INITIAL_STATE,
  OTHER,
  type ActionState,
  type FieldName,
  type RawValues,
} from "./validation";
import styles from "./RegisterForm.module.css";

type Option = { slug: string; label: string; durationYears?: number | null };

type Props = {
  taxonomy: { degreeLevels: Option[]; programmes: Option[]; researchStages: Option[] };
};

const SECTIONS = [
  { id: "about", n: 1, title: "About you" },
  { id: "programme", n: 2, title: "Your programme" },
  { id: "research", n: 3, title: "Your research" },
] as const;

const DRAFT_SID_KEY = "pgsts:register:sid";
const DRAFT_PREFIX = "pgsts:register:draft:";

const labelOf = (opts: Option[], slug: string) => opts.find((o) => o.slug === slug)?.label ?? slug;

export default function RegisterForm({ taxonomy }: Props) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    submitRegistration,
    INITIAL_STATE,
  );
  const uid = useId();
  const summaryRef = useRef<HTMLDivElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  if (state.status === "done") return <SuccessScreen />;
  if (state.status === "review") {
    return <ReviewScreen state={state} taxonomy={taxonomy} formAction={formAction} pending={pending} uid={uid} />;
  }

  return (
    <EditScreen
      state={state}
      taxonomy={taxonomy}
      formAction={formAction}
      pending={pending}
      uid={uid}
      summaryRef={summaryRef}
      formRef={formRef}
    />
  );
}

// ---------------------------------------------------------------------------
// Edit screen
// ---------------------------------------------------------------------------

function EditScreen({
  state,
  taxonomy,
  formAction,
  pending,
  uid,
  summaryRef,
  formRef,
}: {
  state: Extract<ActionState, { status: "editing" }>;
  taxonomy: Props["taxonomy"];
  formAction: (fd: FormData) => void;
  pending: boolean;
  uid: string;
  summaryRef: React.RefObject<HTMLDivElement | null>;
  formRef: React.RefObject<HTMLFormElement | null>;
}) {
  const { values, errors, message, focus } = state;
  const [degreeLevel, setDegreeLevel] = useState(values.degreeLevel);
  const [programme, setProgramme] = useState(values.programme);
  const [topicLength, setTopicLength] = useState(values.researchTopic.length);
  const [showResume, setShowResume] = useState(false);
  const sidRef = useRef<string | null>(null);
  const saveTimer = useRef<number | undefined>(undefined);

  const fieldId = (n: string) => `${uid}-${n}`;
  const errId = (n: string) => `${uid}-${n}-err`;
  const hintId = (n: string) => `${uid}-${n}-hint`;

  const errorEntries = FIELD_NAMES.filter((n) => errors[n]).map((n) => ({ n, message: errors[n]! }));

  // --- Focus the summary, or the section the student asked to edit --------
  useEffect(() => {
    if (errorEntries.length > 0 || message) {
      summaryRef.current?.focus();
      return;
    }
    if (focus) {
      const el = document.getElementById(`${uid}-sec-${focus}`);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
      el?.querySelector<HTMLElement>("input, select, textarea")?.focus({ preventScroll: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // --- Draft autosave (progressive enhancement only) ---------------------
  useEffect(() => {
    try {
      let sid = window.localStorage.getItem(DRAFT_SID_KEY);
      if (!sid) {
        sid = crypto.randomUUID();
        window.localStorage.setItem(DRAFT_SID_KEY, sid);
      }
      sidRef.current = sid;
      if (window.localStorage.getItem(DRAFT_PREFIX + sid)) setShowResume(true);
    } catch {
      // Private mode or blocked storage. Autosave is a convenience; the form
      // works without it.
    }
  }, []);

  const scheduleSave = () => {
    if (!sidRef.current || !formRef.current) return;
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      try {
        const fd = new FormData(formRef.current!);
        const obj: Record<string, string> = {};
        for (const k of FIELD_NAMES) {
          const v = fd.get(k);
          obj[k] = typeof v === "string" ? v : "";
        }
        window.localStorage.setItem(DRAFT_PREFIX + sidRef.current!, JSON.stringify(obj));
      } catch {
        /* storage unavailable */
      }
    }, 500);
  };

  const applyDraft = () => {
    try {
      const raw = window.localStorage.getItem(DRAFT_PREFIX + sidRef.current);
      if (raw && formRef.current) {
        const saved = JSON.parse(raw) as Partial<RawValues>;
        for (const [k, v] of Object.entries(saved)) {
          const el = formRef.current.elements.namedItem(k);
          if (!el) continue;
          if (el instanceof RadioNodeList) {
            for (const node of Array.from(el)) {
              if (node instanceof HTMLInputElement) node.checked = node.value === v;
            }
          } else if (el instanceof HTMLInputElement) {
            if (el.type === "checkbox") el.checked = v === "on";
            else el.value = String(v ?? "");
          } else if (el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
            el.value = String(v ?? "");
          }
        }
        if (saved.degreeLevel) setDegreeLevel(saved.degreeLevel);
        if (saved.programme) setProgramme(saved.programme);
        if (saved.researchTopic) setTopicLength(saved.researchTopic.length);
      }
    } catch {
      /* ignore */
    }
    setShowResume(false);
  };

  const discardDraft = () => {
    try {
      window.localStorage.removeItem(DRAFT_PREFIX + sidRef.current);
    } catch {
      /* ignore */
    }
    setShowResume(false);
  };

  // --- Keep the focused field above the on-screen keyboard ---------------
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || !/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      if (el.getBoundingClientRect().bottom > vv.height - 16) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    };
    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  }, []);

  // --- Programme grouping / cascade --------------------------------------
  const levelOf = useMemo(() => {
    return (slug: string): string | null => {
      if (programmeDegreeLevel[slug]) return programmeDegreeLevel[slug];
      const prefix = slug.split("-")[0];
      return taxonomy.degreeLevels.find((d) => d.slug === prefix)?.slug ?? null;
    };
  }, [taxonomy.degreeLevels]);

  const groups = useMemo(
    () =>
      taxonomy.degreeLevels.map((level) => ({
        level,
        items: taxonomy.programmes.filter((p) => levelOf(p.slug) === level.slug),
      })),
    [taxonomy.degreeLevels, taxonomy.programmes, levelOf],
  );

  const ungrouped = useMemo(
    () => taxonomy.programmes.filter((p) => levelOf(p.slug) === null),
    [taxonomy.programmes, levelOf],
  );

  // With no level chosen — and in the server-rendered HTML a non-JS browser
  // gets — every programme is listed, grouped by level. Choosing a level
  // narrows it.
  const visible = degreeLevel ? groups.filter((g) => g.level.slug === degreeLevel) : groups;

  const describedBy = (n: FieldName, hasHint: boolean) => {
    const ids: string[] = [];
    if (hasHint) ids.push(hintId(n));
    if (errors[n]) ids.push(errId(n));
    return ids.length ? ids.join(" ") : undefined;
  };

  const Err = ({ n }: { n: FieldName }) => (
    <p className={styles.error} id={errId(n)}>
      {errors[n] ?? ""}
    </p>
  );

  const Text = (p: {
    n: FieldName;
    label: string;
    hint?: string;
    type?: string;
    inputMode?: "email" | "tel" | "text";
    autoComplete?: string;
    autoCapitalize?: string;
    spellCheck?: boolean;
  }) => (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={fieldId(p.n)}>
        {p.label}
      </label>
      {p.hint && (
        <p className={styles.hint} id={hintId(p.n)}>
          {p.hint}
        </p>
      )}
      <input
        id={fieldId(p.n)}
        name={p.n}
        defaultValue={values[p.n]}
        type={p.type ?? "text"}
        inputMode={p.inputMode}
        autoComplete={p.autoComplete}
        autoCapitalize={p.autoCapitalize}
        spellCheck={p.spellCheck}
        className={styles.input}
        aria-invalid={errors[p.n] ? true : undefined}
        aria-describedby={describedBy(p.n, Boolean(p.hint))}
        onChange={scheduleSave}
      />
      <Err n={p.n} />
    </div>
  );

  return (
    <>
      {showResume && (
        <div className={styles.resume}>
          <p className={styles.resumeText}>We saved your progress on this device.</p>
          <div className={styles.resumeActions}>
            <button type="button" className={styles.textButton} onClick={applyDraft}>
              Resume
            </button>
            <button type="button" className={styles.textButtonQuiet} onClick={discardDraft}>
              Start over
            </button>
          </div>
        </div>
      )}

      <form ref={formRef} className={styles.form} action={formAction} noValidate onChange={scheduleSave}>
        {(errorEntries.length > 0 || message) && (
          <div className={styles.summary} role="alert" tabIndex={-1} ref={summaryRef}>
            <p className={styles.summaryTitle}>
              {message ? "We couldn't submit your registration" : "Please check these before continuing"}
            </p>
            {message && <p className={styles.summaryBody}>{message}</p>}
            {errorEntries.length > 0 && (
              <ul className={styles.summaryList}>
                {errorEntries.map((e) => (
                  <li key={e.n}>
                    <a href={`#${fieldId(e.n)}`}>{FIELD_LABELS[e.n]}</a> — {e.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ----------------- Section 1 ----------------- */}
        <Section id="about" uid={uid} n={1} title="About you">
          <div className={styles.twoUp}>
            <Text n="surname" label="Surname / family name" autoComplete="family-name" autoCapitalize="words" />
            <Text
              n="firstNames"
              label="First name(s)"
              hint="As they appear on your admission letter"
              autoComplete="given-name"
              autoCapitalize="words"
            />
          </div>
          <Text
            n="regNumber"
            label="Admission / registration number"
            hint={registration.regNumberHint}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
          />
          <Text
            n="email"
            label="Email address"
            hint="We'll send your confirmation here"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
          />
          <Text
            n="phone"
            label="Telephone number"
            hint="Mobile preferred, e.g. 0712 345 678"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
          />
        </Section>

        {/* ----------------- Section 2 ----------------- */}
        <Section id="programme" uid={uid} n={2} title="Your programme">
          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>Degree level</legend>
            <div className={styles.segmented}>
              {taxonomy.degreeLevels.map((d) => (
                <label key={d.slug} className={styles.segment}>
                  <input
                    type="radio"
                    name="degreeLevel"
                    value={d.slug}
                    defaultChecked={values.degreeLevel === d.slug}
                    className={styles.visuallyHidden}
                    onChange={(e) => {
                      setDegreeLevel(e.currentTarget.value);
                      scheduleSave();
                    }}
                  />
                  <span className={styles.segmentLabel}>{d.label}</span>
                </label>
              ))}
            </div>
            <Err n="degreeLevel" />
          </fieldset>

          <div className={styles.field}>
            <label className={styles.label} htmlFor={fieldId("programme")}>
              Programme
            </label>
            <select
              id={fieldId("programme")}
              name="programme"
              defaultValue={values.programme}
              className={styles.select}
              aria-invalid={errors.programme ? true : undefined}
              aria-describedby={describedBy("programme", false)}
              onChange={(e) => {
                setProgramme(e.currentTarget.value);
                scheduleSave();
              }}
            >
              <option value="">Choose your programme…</option>
              {visible.map((g) =>
                g.items.length ? (
                  <optgroup key={g.level.slug} label={g.level.label}>
                    {g.items.map((p) => (
                      <option key={p.slug} value={p.slug}>
                        {p.label}
                      </option>
                    ))}
                  </optgroup>
                ) : null,
              )}
              {ungrouped.length > 0 && (
                <optgroup label="Other programmes">
                  {ungrouped.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.label}
                    </option>
                  ))}
                </optgroup>
              )}
              <option value={OTHER}>Other (please specify)</option>
            </select>
            <Err n="programme" />
          </div>

          {programme === OTHER && (
            <Text
              n="programmeOther"
              label="Programme name"
              hint="Type the full name of your programme"
              autoCapitalize="words"
            />
          )}

          <div className={styles.field}>
            <label className={styles.label} htmlFor={fieldId("admissionYear")}>
              Year of admission
            </label>
            <p className={styles.hint} id={hintId("admissionYear")}>
              The year you first registered for this programme.
            </p>
            <select
              id={fieldId("admissionYear")}
              name="admissionYear"
              defaultValue={values.admissionYear}
              className={styles.select}
              aria-invalid={errors.admissionYear ? true : undefined}
              aria-describedby={describedBy("admissionYear", true)}
              onChange={scheduleSave}
            >
              <option value="">Choose a year…</option>
              {Array.from({ length: registration.admissionYearsBack + 1 }, (_, i) => new Date().getFullYear() - i).map(
                (y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ),
              )}
            </select>
            <Err n="admissionYear" />
          </div>
        </Section>

        {/* ----------------- Section 3 ----------------- */}
        <Section id="research" uid={uid} n={3} title="Your research">
          <div className={styles.field}>
            <label className={styles.label} htmlFor={fieldId("researchTopic")}>
              Research topic or description
            </label>
            <p className={styles.hint} id={hintId("researchTopic")}>
              One or two sentences. If your title isn&rsquo;t final, describe what you&rsquo;re working on.
            </p>
            <textarea
              id={fieldId("researchTopic")}
              name="researchTopic"
              defaultValue={values.researchTopic}
              rows={4}
              maxLength={registration.researchTopicMaxLength}
              className={styles.textarea}
              aria-invalid={errors.researchTopic ? true : undefined}
              aria-describedby={describedBy("researchTopic", true)}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = `${el.scrollHeight}px`;
                setTopicLength(el.value.length);
              }}
              onChange={scheduleSave}
            />
            <div className={styles.metaRow}>
              <Err n="researchTopic" />
              {topicLength >= registration.researchTopicCounterFrom && (
                <span className={styles.counter} aria-live="polite">
                  {topicLength} / {registration.researchTopicMaxLength}
                </span>
              )}
            </div>
          </div>

          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>Primary supervisor</legend>
            <div className={styles.twoUp}>
              <Text n="supervisor1First" label="First name" autoComplete="off" autoCapitalize="words" />
              <Text n="supervisor1Surname" label="Surname" autoComplete="off" autoCapitalize="words" />
            </div>
          </fieldset>

          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>Second supervisor (optional)</legend>
            <div className={styles.twoUp}>
              <Text n="supervisor2First" label="First name" autoComplete="off" autoCapitalize="words" />
              <Text n="supervisor2Surname" label="Surname" autoComplete="off" autoCapitalize="words" />
            </div>
          </fieldset>

          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>Current stage</legend>
            <div className={styles.journey}>
              {taxonomy.researchStages.map((s) => (
                <label key={s.slug} className={styles.stage}>
                  <input
                    type="radio"
                    name="stage"
                    value={s.slug}
                    defaultChecked={values.stage === s.slug}
                    className={styles.visuallyHidden}
                    onChange={scheduleSave}
                  />
                  <span className={styles.stageDot} aria-hidden="true" />
                  <span className={styles.stageLabel}>{s.label}</span>
                </label>
              ))}
            </div>
            <Err n="stage" />
          </fieldset>
        </Section>

        <div className={styles.card}>
          <p className={styles.noteLine}>
            We collect this to maintain the departmental postgraduate register. We never share it for
            marketing.
          </p>
          <div className={styles.field}>
            <label className={styles.checkRow} htmlFor={fieldId("acknowledged")}>
              <input
                type="checkbox"
                id={fieldId("acknowledged")}
                name="acknowledged"
                defaultChecked={values.acknowledged === "on"}
                className={styles.checkbox}
                aria-invalid={errors.acknowledged ? true : undefined}
                aria-describedby={describedBy("acknowledged", false)}
                onChange={scheduleSave}
              />
              <span>
                <AcknowledgementText />
              </span>
            </label>
            <Err n="acknowledged" />
          </div>
        </div>

        <div className={styles.submitBar}>
          <button type="submit" className={styles.submit}>
            {pending ? "Checking…" : "Submit registration"}
          </button>
        </div>
      </form>
    </>
  );
}

// ---------------------------------------------------------------------------
// Review screen
// ---------------------------------------------------------------------------

function ReviewScreen({
  state,
  taxonomy,
  formAction,
  pending,
  uid,
}: {
  state: Extract<ActionState, { status: "review" }>;
  taxonomy: Props["taxonomy"];
  formAction: (fd: FormData) => void;
  pending: boolean;
  uid: string;
}) {
  const v = state.values;
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const supervisors = [`${v.supervisor1First} ${v.supervisor1Surname}`.trim()];
  if (v.supervisor2First.trim() && v.supervisor2Surname.trim()) {
    supervisors.push(`${v.supervisor2First} ${v.supervisor2Surname}`.trim());
  }

  const rows: Record<(typeof SECTIONS)[number]["id"], [string, string][]> = {
    about: [
      ["Name", `${v.firstNames} ${v.surname}`.trim()],
      ["Registration number", v.regNumber],
      ["Email address", v.email],
      ["Telephone", v.phone],
    ],
    programme: [
      ["Degree level", labelOf(taxonomy.degreeLevels, v.degreeLevel)],
      [
        "Programme",
        v.programme === OTHER ? v.programmeOther : labelOf(taxonomy.programmes, v.programme),
      ],
      ["Year of admission", v.admissionYear],
    ],
    research: [
      ["Research topic", v.researchTopic],
      [supervisors.length > 1 ? "Supervisors" : "Supervisor", supervisors.join(" · ")],
      ["Current stage", labelOf(taxonomy.researchStages, v.stage)],
    ],
  };

  return (
    <form className={styles.form} action={formAction}>
      {/* Everything the student entered travels with the confirmation, so the
          flow is identical with or without JavaScript. */}
      {FIELD_NAMES.map((n) => (
        <input key={n} type="hidden" name={n} value={v[n]} />
      ))}

      <div className={styles.reviewIntro}>
        <h2 className={styles.reviewTitle} tabIndex={-1} ref={headingRef}>
          Check your details
        </h2>
        <p className={styles.noteLine}>Check your details. You can still edit anything before sending.</p>
      </div>

      {SECTIONS.map((s) => (
        <section key={s.id} className={styles.card} aria-labelledby={`${uid}-rev-${s.id}`}>
          <div className={styles.reviewHead}>
            <h3 className={styles.reviewSectionTitle} id={`${uid}-rev-${s.id}`}>
              {s.title}
            </h3>
            <button type="submit" name="_edit" value={s.id} className={styles.textButton}>
              Edit<span className={styles.visuallyHidden}> {s.title}</span>
            </button>
          </div>
          <dl className={styles.reviewList}>
            {rows[s.id].map(([k, val]) => (
              <div key={k} className={styles.reviewRow}>
                <dt className={styles.reviewKey}>{k}</dt>
                <dd className={styles.reviewValue}>{val || "—"}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}

      <div className={styles.card}>
        <p className={styles.noteLine}>
          <AcknowledgementText />
        </p>
      </div>

      <div className={styles.submitBar}>
        <button type="submit" name="confirm" value="1" className={styles.submit}>
          {pending ? "Sending…" : "Confirm and submit"}
        </button>
        <button type="submit" name="_edit" value="about" className={styles.textButtonWide}>
          Go back and edit
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

function Section({
  id,
  uid,
  n,
  title,
  children,
}: {
  id: string;
  uid: string;
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.section} id={`${uid}-sec-${id}`} aria-labelledby={`${uid}-h-${id}`}>
      <div className={styles.sectionHead}>
        <p className={styles.sectionKicker}>Section {n} of 3</p>
        <h2 className={styles.sectionTitle} id={`${uid}-h-${id}`}>
          {title}
        </h2>
      </div>
      <div className={styles.card}>{children}</div>
    </section>
  );
}

function AcknowledgementText() {
  return institution.lawfulBasisMode === "consent" ? (
    <>
      I agree to the Department of Education registering my details as described in the{" "}
      <a className={styles.noticeLink} href="/privacy">
        Privacy Notice
      </a>
      .
    </>
  ) : (
    <>
      I have read the{" "}
      <a className={styles.noticeLink} href="/privacy">
        Privacy Notice
      </a>{" "}
      and understand how my information will be used.
    </>
  );
}

function SuccessScreen() {
  return (
    <div className={styles.success} role="status">
      <svg className={styles.successMark} viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="24" cy="24" r="22" fill="none" stroke="currentColor" strokeWidth="2" opacity=".3" />
        <path
          d="M15 24.5l6.5 6.5L33 19"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <p className={styles.successText}>Registration submitted successfully. Thank you.</p>

      {/* Somewhere to go next. Still no echoed values, no record id, and no
          route into the register — just a way out of the form. */}
      <p className={styles.successNext}>
        You can close this window, or{" "}
        <a className={styles.successLink} href="/">
          return to the home page
        </a>
        .
      </p>
    </div>
  );
}

export { FIELD_SECTION };
