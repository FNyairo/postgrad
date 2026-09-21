import styles from "./HowItWorks.module.css";

// Exact copy from the brief, split into number/title/body for card layout —
// no wording added or removed.
const STEPS = [
  {
    number: "01",
    title: "Fill the form",
    body: "Ten fields. About ninety seconds on a phone.",
  },
  {
    number: "02",
    title: "We verify",
    body: "Your record is checked against the department register.",
  },
  {
    number: "03",
    title: "You're done",
    body: "One record. No repeat submissions.",
  },
] as const;

export function HowItWorks() {
  return (
    <section className={styles.section} aria-labelledby="how-it-works-heading">
      <div className={styles.inner}>
        <h2 id="how-it-works-heading" className={styles.heading}>
          How it works
        </h2>
        <div className={styles.grid}>
          {STEPS.map((step) => (
            <div className={styles.card} key={step.number}>
              <span className={styles.number}>{step.number}</span>
              <p className={styles.title}>{step.title}</p>
              <p className={styles.body}>{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
