import type { Metadata } from "next";
import { loadTaxonomy } from "@/lib/taxonomy";
import RegisterForm from "./RegisterForm";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Register — Postgraduate Register",
  description:
    "Add your details to the Department of Education postgraduate register. Three short sections, about ninety seconds.",
};

// The pickers are driven by the Taxonomy table, so this page reads the
// database per request rather than being prerendered at build time.
export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const taxonomy = await loadTaxonomy();

  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <header className={styles.header}>
          <h1 className={styles.title}>Join the postgraduate register</h1>
          <p className={styles.lede}>
            Three short sections, then a chance to check everything before you send it. About ninety
            seconds on a phone.
          </p>
        </header>

        <RegisterForm taxonomy={taxonomy} />
      </div>
    </main>
  );
}
