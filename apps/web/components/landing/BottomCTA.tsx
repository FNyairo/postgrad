import Link from "next/link";
import styles from "./BottomCTA.module.css";

// Repeats the hero's CTA and trust line verbatim, for anyone who scrolled
// through the collapsible cards without registering.
export function BottomCTA() {
  return (
    <section className={styles.section}>
      <div className={styles.card}>
        <h2 className={styles.heading}>Ready to register?</h2>
        <Link href="/register" className={styles.cta}>
          Register now
        </Link>
        <p className={styles.trust}>
          Protected under the Kenya Data Protection Act, 2019. <Link href="/privacy">Read our privacy notice</Link>.
        </p>
      </div>
    </section>
  );
}
