import { redirect } from "next/navigation";
import { getCurrentStaffUser } from "@/lib/session";
import ChangePasswordForm from "./ChangePasswordForm";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function ChangePasswordPage() {
  const user = await getCurrentStaffUser();
  if (!user) redirect("/login");

  const forced = user.mustChangePassword;

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>{forced ? "Choose a new password" : "Change your password"}</h1>
        {forced && (
          <p className={styles.notice}>
            This account is still using the temporary password it was created with. Choose your own
            before continuing — it was shown in plain text when the account was set up, so it
            shouldn&rsquo;t stay in use.
          </p>
        )}
        <ChangePasswordForm forced={forced} />
      </div>
    </main>
  );
}
