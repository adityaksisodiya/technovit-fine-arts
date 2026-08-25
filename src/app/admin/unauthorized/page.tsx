import type { Metadata } from "next";
import Link from "next/link";
import { logoutAction } from "../actions";
import styles from "./unauthorized.module.css";

export const metadata: Metadata = {
  title: "Access Forbidden",
  robots: {
    index: false,
    follow: false,
  },
};

export default function UnauthorizedPage() {
  return (
    <main className={styles.container}>
      <div className={styles.card}>
        <div className={styles.icon} aria-hidden="true">
          🔒
        </div>
        <span className={styles.overline}>Access Restricted</span>
        <h1 className={styles.title}>Insufficient Permissions</h1>
        <p className={styles.description}>
          Your account does not have the required administrative privileges to access this section. If you believe this is an error, please contact a Super Administrator.
        </p>

        <div className={styles.actions}>
          <Link href="/admin/dashboard" className="btn btn--secondary">
            Go to Dashboard
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="btn btn--ghost">
              Sign Out
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
