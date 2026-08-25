"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { loginAction, type LoginActionResult } from "./actions";
import styles from "./login.module.css";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`btn btn--primary ${styles.submitBtn}`}
      id="admin-login-submit"
    >
      {pending ? "Signing In..." : "Sign In to Admin"}
    </button>
  );
}

interface LoginFormProps {
  initialError?: string;
  redirectUrl?: string;
}

export function LoginForm({ initialError, redirectUrl }: LoginFormProps) {
  const [state, formAction] = useActionState<LoginActionResult | null, FormData>(
    loginAction,
    initialError ? { error: initialError } : null
  );

  return (
    <form action={formAction} className={styles.form} noValidate>
      {state?.error && (
        <div className={`${styles.alert} ${styles.alertError}`} role="alert">
          <span aria-hidden="true">⚠️</span>
          <span>{state.error}</span>
        </div>
      )}

      {redirectUrl && (
        <input type="hidden" name="redirect" value={redirectUrl} />
      )}

      <div className={styles.field}>
        <label htmlFor="email" className={styles.label}>
          Admin Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="admin@vit.ac.in"
          className={styles.input}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="password" className={styles.label}>
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••••••"
          className={styles.input}
        />
      </div>

      <SubmitButton />

      <footer className={styles.footer}>
        <p className={styles.footerNote}>
          Fine Arts Club × VIT Chennai. Access restricted to verified administrators.
        </p>
        <Link href="/" className={styles.backLink}>
          ← Back to Public Gallery
        </Link>
      </footer>
    </form>
  );
}
