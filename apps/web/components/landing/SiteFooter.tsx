import Link from "next/link";
import { getCurrentStaffSession } from "@/lib/session";
import { institution } from "@pgsts/config";
import styles from "./SiteFooter.module.css";

/**
 * Landing-page footer.
 *
 * The staff link is deliberately small and last: a register aimed at students
 * shouldn't advertise a staff door. When a staff session already exists the
 * link becomes a way back to the dashboard rather than a second login prompt.
 *
 * Reads the session cookie, so this renders per request — it is a server
 * component and the page that hosts it must not be statically prerendered.
 */
export default async function SiteFooter() {
  let signedIn = false;
  try {
    signedIn = (await getCurrentStaffSession()) !== null;
  } catch {
    // A missing IP_HASH_PEPPER or an unreachable database must not take the
    // public landing page down. Fall back to the signed-out link.
    signedIn = false;
  }

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <p className={styles.org}>
          {institution.departmentName}, {institution.universityName}
        </p>

        <nav className={styles.links} aria-label="Footer">
          <Link className={styles.link} href="/privacy">
            Privacy
          </Link>
          <Link className={styles.link} href="/data-request">
            Data request
          </Link>
          <Link className={styles.staffLink} href={signedIn ? "/dashboard" : "/login"}>
            {signedIn ? "Go to dashboard →" : "Staff login"}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
