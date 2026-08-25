import type { Metadata } from "next";
import { LoginForm } from "./login-form";
import styles from "./login.module.css";

export const metadata: Metadata = {
  title: "Administrator Sign In",
  description: "Sign in to the TechnoVIT Fine Arts Photo Gallery administration panel.",
  robots: {
    index: false,
    follow: false,
  },
};

interface LoginPageProps {
  searchParams: Promise<{
    redirect?: string;
    error?: string;
  }>;
}

export default async function AdminLoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  let initialError: string | undefined;
  if (params.error === "unauthorized") {
    initialError = "Your account is not authorized as an administrator.";
  } else if (params.error === "session_expired") {
    initialError = "Your administrator session has expired. Please sign in again.";
  }

  return (
    <main className={styles.container}>
      <div className={styles.card}>
        <header className={styles.header}>
          <span className={styles.overline}>Fine Arts Club × VIT Chennai</span>
          <h1 className={styles.title}>
            Techno<span className={styles.titleAccent}>VIT</span> Admin
          </h1>
          <p className={styles.subtitle}>
            Administrator & Moderator Sign In
          </p>
        </header>

        <LoginForm
          initialError={initialError}
          redirectUrl={params.redirect}
        />
      </div>
    </main>
  );
}
