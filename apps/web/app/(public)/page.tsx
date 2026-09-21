import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { CollapsibleCard } from "@/components/landing/CollapsibleCard";
import { BottomCTA } from "@/components/landing/BottomCTA";
import styles from "./page.module.css";

// Streamlined, mobile-first landing page. Ported from the reviewed static
// design (docs/design/landing-preview.html), cut from six always-visible
// sections down to four viewport scrolls: Hero -> How It Works -> four
// collapsed detail cards -> a repeated bottom CTA. Everything below the
// fold that isn't the registration decision itself is now opt-in via the
// collapsible cards, per the landing-page brief.
//
// Deliberately left out vs. the static preview (per the brief):
//   - the stats row and the "Read how we protect it" hero anchor
//   - "Who can see your record" as its own section (folded into the
//     "How we protect your information" card, without naming a role)
//   - "What is coming later" (belongs on About/the privacy notice instead)
//   - any mention of "Chairperson", "Coordinator", or a named staff role
export default function LandingPage() {
  return (
    <main>
      <Hero />
      <HowItWorks />

      <section className={styles.details} aria-label="More about the register">
        <div className={styles.detailsInner}>
          <CollapsibleCard
            title="What we store"
            summary="Ten fields — biodata, academic, and research details. Nothing else."
          >
            <p>
              <strong>Biodata:</strong> full name, admission/registration number, email
              address, phone number.
            </p>
            <p>
              <strong>Academic:</strong> programme, degree level, year of admission.
            </p>
            <p>
              <strong>Research:</strong> research title, supervisors, current research
              stage.
            </p>
            <p>
              <strong>What we never collect:</strong> no national ID number, no date of
              birth, no photograph, no financial information, no biometric data. We
              don&rsquo;t use your information for advertising, don&rsquo;t share it outside the
              department, and never sell it.
            </p>
          </CollapsibleCard>

          <CollapsibleCard
            title="How we protect your information"
            summary="TLS 1.3 in transit, encrypted staff credentials, logged access."
          >
            <p>
              Your information travels to us over an encrypted connection using TLS 1.3.
              Security credentials for staff accounts are encrypted in our database, and
              the register itself is held on access-controlled systems.
            </p>
            <p>
              Access to your record is limited to a read-only reviewer. Every time the
              register is opened, exported, or changed, the system records it.
            </p>
            <p>
              We keep your record until you graduate, and then for five more years —
              after that it is deleted automatically.
            </p>
          </CollapsibleCard>

          <CollapsibleCard
            title="Why it matters"
            summary="Six things an accurate record actually changes for you."
          >
            <p>
              <strong>Your progress is tracked accurately</strong> — your supervisors and
              the department can see where you are and support you properly.
            </p>
            <p>
              <strong>You only tell us once</strong> — the department uses the same
              record for all internal coordination.
            </p>
            <p>
              <strong>You hear about things that matter</strong> — seminars, deadlines,
              funding calls, and defence schedules. Nothing else.
            </p>
            <p>
              <strong>Your rights are protected</strong> — under the Kenya Data Protection
              Act, 2019 you can ask for a copy of your record, ask us to correct it, or
              ask us to delete it.
            </p>
            <p>
              <strong>Fewer delays at milestones</strong> — accurate records mean less
              back-and-forth at defence and graduation.
            </p>
            <p>
              <strong>A connection after you graduate</strong> — opt in to alumni events,
              mentorship, and research collaborations.
            </p>
          </CollapsibleCard>

          <CollapsibleCard
            title="Stay updated"
            summary="Optional email updates on seminars, funding, and alumni events."
          >
            <p>
              Occasional updates about seminars, funding opportunities, defence
              schedules, and alumni events — only when we have something worth your
              time. You can also set this up after you register.
            </p>
            {/* TODO: wire to a real newsletter-subscription endpoint once one
                exists (see .env.example — MAILER_* isn't read by any code
                yet). Left as a plain, JS-free form for now. */}
            <form className={styles.newsletterForm}>
              <label className={styles.newsletterLabel} htmlFor="landing-newsletter-email">
                Email address
              </label>
              <input
                id="landing-newsletter-email"
                name="email"
                type="email"
                placeholder="you@example.ac.ke"
                autoComplete="email"
                className={styles.newsletterInput}
              />
              <button type="submit" className={styles.newsletterSubmit}>
                Subscribe
              </button>
            </form>
          </CollapsibleCard>
        </div>
      </section>

      <BottomCTA />
    </main>
  );
}
