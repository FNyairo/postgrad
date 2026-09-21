import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { institution } from "@pgsts/config";
import { getCurrentStaffUser } from "@/lib/session";
import LoginForm from "./LoginForm";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Staff login — Postgraduate Register",
  // Staff pages have no business in search results.
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function StaffLoginPage() {
  // Following the footer link while already signed in should go where the
  // person actually wants to be, rather than asking for a password again.
  const user = await getCurrentStaffUser().catch(() => null);
  if (user) redirect(user.mustChangePassword ? "/account/password" : "/dashboard");

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.head}>
          <h1 className={styles.title}>Staff login</h1>
          <p className={styles.sub}>
            {institution.departmentName}, {institution.universityName}
          </p>
        </div>

        <LoginForm />

        <p className={styles.back}>
          <a className={styles.backLink} href="/">
            Back to the home page
          </a>
        </p>
      </div>
    </main>
  );
}
