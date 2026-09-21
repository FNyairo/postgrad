import Link from "next/link";
import styles from "./Hero.module.css";

// Hero: photo background + headline + subhead + one full-width CTA + one
// trust line. No stats row, no secondary anchor link — both were cut from
// the six-section design (docs/design/landing-preview.html) to get to the
// CTA faster on mobile. Height stays under the 700px/360px budget by
// keeping the text stack to four short elements.
//
// Plain <picture>/<img>, not next/image: next/image's on-the-fly
// optimizer needs `sharp` in production with output:"standalone", which
// isn't a dependency here, and the brief says not to add one. The public/
// files already ship pre-built avif+jpg variants, so the manual <picture>
// gets the same responsive/format behavior without it.
export function Hero() {
  return (
    <header className={styles.hero}>
      <picture>
        <source
          type="image/avif"
          srcSet="/images/hero-800.avif 800w, /images/hero-1200.avif 1200w, /images/hero-1800.avif 1800w"
          sizes="100vw"
        />
        <img
          className={styles.photo}
          src="/images/hero-1200.jpg"
          srcSet="/images/hero-800.jpg 800w, /images/hero-1200.jpg 1200w, /images/hero-1800.jpg 1800w"
          sizes="100vw"
          alt=""
          width={1800}
          height={787}
          fetchPriority="high"
          decoding="async"
        />
      </picture>
      <div className={styles.inner}>
        <p className={styles.eyebrow}>University of Embu · Department of Education</p>
        <h1 className={styles.headline}>Get on the register. Avoid delays.</h1>
        <p className={styles.subhead}>
          The department&rsquo;s official postgraduate record — one form, used to support your
          progress.
        </p>
        <Link href="/register" className={styles.cta}>
          Register now
        </Link>
        <p className={styles.trust}>
          Protected under the Kenya Data Protection Act, 2019. <Link href="/privacy">Read our privacy notice</Link>.
        </p>
      </div>
    </header>
  );
}
