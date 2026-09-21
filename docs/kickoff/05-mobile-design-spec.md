# PGSTS — Mobile-First Design Spec: Student Registration Flow

Designed at 360 px first. Everything below is the phone behaviour; wider
viewports are the progressive enhancement.

---

## 1. The wizard question — recommendation: do not build one

§11.3 asks me to consider a three-step wizard on mobile. I recommend a **single
scrolling page with sticky section headers** instead, and I want to give the
reasoning rather than just the answer.

**Against the wizard, at this form's size:**

- It is ten fields. A wizard adds two extra screens and two extra taps to a
  form a student can finish in about ninety seconds.
- It fights §11.1's progressive-enhancement requirement. A no-JavaScript wizard
  needs three server round trips and server-held partial state — a
  disproportionate amount of machinery, and a new place to leak personal data.
- "Scroll to the first invalid field and focus it" becomes "work out which step
  holds the first invalid field, navigate there, then scroll and focus."
- Draft recovery gets a second question to answer: not just what was typed, but
  which step the student was on.
- Every step boundary is a place to abandon. For a short form, more steps means
  more drop-off, not less.

**For the single page:**

- Sticky section headers ("Section B of 3 · Academic information") give the same
  sense of structure and progress with no navigation.
- It works identically with JavaScript off: one form, one POST, one response.
- One scroll position to restore on draft recovery.
- All errors are reachable from one summary banner.

**When I would change my mind:** if Phase 2 pushes the form past roughly fifteen
fields, or adds a file upload for proposals, the wizard starts to earn its
complexity. The component tree below keeps sections as discrete components
precisely so that conversion stays cheap.

---

## 2. Breakpoints

Mobile-first `min-width` queries throughout. Container queries for the form
card so it behaves correctly if it is ever embedded.

| Width | Form layout | Notes |
|---|---|---|
| 320 | 1 column, 16 px gutters | Must not break. Galaxy Fold cover, iPhone SE 1. |
| 360 | 1 column, 16 px gutters | **Design baseline.** |
| 390–414 | 1 column, 20 px gutters | Modern phones. |
| 480 | 1 column, wider card | Year/phone may pair if measurement allows. |
| 600 | 2 columns for short fields | Title and supervisors stay full width. |
| 768 | 2 columns, all sections visible | Sticky bar becomes inline. |
| 1024+ | Centred card, `max-width: 720px` | No further stretching. |

Rules carried through: no fixed container widths — `min()`, `clamp()`,
`grid minmax()` only; `gap` rather than margins; logical properties
(`padding-inline`, `margin-block`); `dvh`/`svh` never `100vh`; and a CI
assertion that `document.body.scrollWidth <= window.innerWidth` at 320, 360,
390, 414, 768, 1024 and 1440.

---

## 3. Component tree

```
<RegisterPage>                     server component, prerendered
├── <SkipLink>                     to #form
├── <PageHeader>                   department name, one-line purpose
├── <DraftBanner>                  client · only if a draft exists
│                                  "We saved your progress. Resume / Start over"
├── <RegistrationForm>             client island — the ONLY hydrated subtree
│   ├── <ErrorSummary>             role="alert", appears above the form on
│   │                              failed submit: "3 fields need your attention"
│   ├── <FormSection id="A">       sticky header, "Section A of 3 · Biodata"
│   │   ├── <TextField  name="fullName">
│   │   ├── <TextField  name="regNumber">
│   │   ├── <EmailField name="email">
│   │   └── <PhoneField name="phone">
│   ├── <FormSection id="B">       "Section B of 3 · Academic information"
│   │   ├── <ComboField name="programme">      free text + suggestions
│   │   ├── <ComboField name="degreeLevel">
│   │   └── <YearField  name="yearAdmission">
│   ├── <FormSection id="C">       "Section C of 3 · Research information"
│   │   ├── <TextArea   name="researchTitle">  auto-grow from 3 rows
│   │   ├── <TextField  name="supervisors">
│   │   └── <ComboField name="researchStage">
│   ├── <NoticeAcknowledgement>    required checkbox + links to /privacy
│   ├── <Honeypot>                 CSS-hidden, never aria-hidden only
│   └── <StickySubmitBar>          position: sticky; bottom: 0
└── <FooterLinks>                  privacy · data request · DPO
```

Everything outside `<RegistrationForm>` is a server component and ships no
JavaScript. That is what makes the 120 KB budget reachable.

### `<ComboField>` — the F3 component

An `<input type="text">` with a `<datalist>` for the no-JavaScript case, upgraded
on hydration to a combobox following the APG pattern: suggestions filter as you
type, arrow keys move through them, and **anything typed is accepted**. No value
is ever rejected for being absent from the list. The normalised slug is computed
server-side on submit; the client never sees or sends it.

---

## 4. Input attributes

Per §11.3.1, with one correction: **`autocomplete="off"` is widely ignored by
mobile browsers.** Where the intent is "do not autofill this with a saved
value", the reliable signal is a non-standard token, which browsers treat as
unrecognised and therefore skip.

| Field | type | inputmode | autocomplete | Other |
|---|---|---|---|---|
| Full Name | text | text | `name` | `autocapitalize="words"` |
| Reg. Number | text | text | `off-regnumber` | `autocapitalize="characters"`, `spellcheck="false"` |
| Email | email | email | `email` | `autocapitalize="none"`, `spellcheck="false"` |
| Phone | tel | tel | `tel` | |
| Programme | text | text | `off-programme` | `autocapitalize="words"`, `list` |
| Degree Level | text | text | `off-degree` | `autocapitalize="words"`, `list` |
| Year of Admission | text | numeric | `off-year` | `pattern="[0-9]{4}"`, `maxlength="4"` |
| Research Title | textarea | text | `off-title` | `rows="3"`, auto-grow |
| Supervisors | text | text | `off-supervisors` | `autocapitalize="words"` |
| Research Stage | text | text | `off-stage` | `autocapitalize="sentences"`, `list` |

`type="text"` with `inputmode="numeric"` for the year, not `type="number"` —
number inputs bring spinners, accept `e` and `+`, and silently discard invalid
input on some browsers rather than letting us validate it.

All inputs are **16 px minimum**, which is what stops iOS zooming on focus.

---

## 5. Sticky submit bar and the virtual keyboard

```css
.submit-bar {
  position: sticky;
  bottom: 0;
  padding-block-end: max(1rem, env(safe-area-inset-bottom));
  /* sticky, not fixed — a fixed bar is what the virtual keyboard covers */
}
```

Plus a Visual Viewport listener that keeps the focused field above the keyboard:

```js
visualViewport.addEventListener('resize', () => {
  const el = document.activeElement
  if (!el?.matches('input, textarea')) return
  const bottom = el.getBoundingClientRect().bottom
  if (bottom > visualViewport.height - 16) {
    el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }
})
```

Submit button: full width, 52 px tall, and it never disables itself. A disabled
submit button on a form with errors is a dead end for screen-reader users, who
get no explanation for why nothing happens. It stays enabled, and pressing it
with errors present moves focus to the error summary.

Touch targets are 48 × 48 CSS px minimum with 8 px gaps — deliberately above
WCAG 2.2 SC 2.5.8's 24 × 24.

---

## 6. Validation and errors

- Validate on **blur**, never per keystroke. Per-keystroke validation tells
  someone their email is invalid while they are still typing it.
- Revalidate on change only once a field is already in an error state, so the
  error clears as soon as it is fixed.
- Error text sits below the field, linked by `aria-describedby`, in a container
  that is **always present with reserved height** — errors must not shift the
  layout. Budget is CLS ≤ 0.05.
- Each error is `role="alert"`; the summary banner is `aria-live="polite"`.
- On failed submit: render the summary, move focus to it, and make each item a
  link to its field.
- Colour is never the only signal — an icon and text accompany every error state.

---

## 7. Draft autosave

- `localStorage`, debounced 500 ms on change.
- Key is a random session-scoped id generated on first interaction. **Never
  keyed to email or registration number** — that would leave identifying data
  in storage keyed by an identifier.
- Everything is wrapped in `try/catch`. Private mode and blocked site data both
  throw; the form must work regardless.
- On load with a draft present: a non-blocking banner offering Resume or Start
  over. Never auto-fill silently — that is unsettling on a shared phone.
- Cleared on successful submit, or on explicit Start over.
- **Drafts are never transmitted anywhere.** No server-side draft endpoint
  exists. The only network call the form makes is the final POST.
- Offline submit failure: "Your connection dropped. Tap to retry — your
  information is saved." The retry button re-POSTs the same payload; the
  server's unique constraints make a double submit harmless.

## 8. Success screen

Full screen, `role="status"`, with the exact required message:

> **Registration submitted successfully. Thank you.**

Large success icon above the fold. Below it: *Submit another registration*,
*Back to home*, and a *Subscribe to updates* link anchoring to the newsletter
section. No submitted values are echoed and no record identifier is shown.

---

## 9. Performance budgets

Inherited from §11.3.7 with one change: **drop FID.** It was replaced by INP as
a Core Web Vital in March 2024 and is no longer reported by Chrome's tooling, so
a threshold on it would never fail and would give false assurance.

| Metric | Target | Ceiling |
|---|---|---|
| LCP (Fast 3G) | ≤ 2.5 s | 3.5 s |
| INP | ≤ 200 ms | 350 ms |
| CLS | ≤ 0.05 | 0.1 |
| JS, gzipped, `/register` | ≤ 120 KB | 180 KB |
| CSS, gzipped | ≤ 30 KB | 50 KB |
| Initial HTML | ≤ 40 KB | 60 KB |
| Lighthouse Perf (mobile) | ≥ 90 | 85 |
| Lighthouse A11y (mobile) | ≥ 95 | 90 |

How the JS budget is met: the page is a server component; only
`<RegistrationForm>` hydrates; Zod validation is shared with the server but
tree-shaken to the schemas this page uses; no chart library, no date library, no
UI kit beyond the primitives actually rendered; Recharts is dynamically imported
and appears only on staff routes.

**One caveat on CI.** Lighthouse cannot reach `/dashboard` — it is behind a
password and TOTP. The pipeline will seed a dedicated CI coordinator account
with a deterministic TOTP secret from a CI-only secret, and Playwright will log
in and hand the session cookie to Lighthouse. The alternative, a bypass flag, is
an auth bypass shipped in production code, and I would rather not have one.

---

## 10. Accessibility

- WCAG 2.2 AA. Visible focus on everything; contrast ≥ 4.5:1 body, ≥ 3:1 large
  text and UI.
- `prefers-reduced-motion` and `prefers-color-scheme` both respected.
- Every field has a real `<label>`. Placeholders are hints, never labels.
- Manual passes with VoiceOver on iOS and TalkBack on Android before release,
  with findings logged in `docs/testing/`.
- `axe-core` on every page in Playwright.
- Tested at the largest system font size — the sticky bar must not swallow the
  viewport when text is scaled to 200%.
- Viewport: `width=device-width, initial-scale=1, viewport-fit=cover`.
  **Zoom is never disabled.**

---

## 11. PWA scope

Deliberately minimal. The service worker caches the app shell for `/register`
only, and **never** caches submissions, student data, or any staff route. The
offline fallback reads: "You're offline. Your draft is saved. Reconnect to
submit."

Add-to-home-screen is left to Android's own prompt. The iOS hint appears once,
after a completed visit, and never again — §11.6.4 calls for a subtle hint and
not a nag, and a dismissed hint that returns is a nag.
