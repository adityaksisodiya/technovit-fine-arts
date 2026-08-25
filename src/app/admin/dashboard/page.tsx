import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { AdminRole } from "@/types";
import { logoutAction } from "../actions";
import styles from "./dashboard.module.css";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  description: "TechnoVIT Photo Gallery Administration & Moderation Panel",
  robots: {
    index: false,
    follow: false,
  },
};

function getRoleBadgeClass(role: AdminRole): string {
  switch (role) {
    case AdminRole.SUPER_ADMIN:
      return styles.roleSuperAdmin;
    case AdminRole.ADMIN:
      return styles.roleAdmin;
    case AdminRole.MODERATOR:
      return styles.roleModerator;
  }
}

function formatRoleLabel(role: AdminRole): string {
  switch (role) {
    case AdminRole.SUPER_ADMIN:
      return "Super Administrator";
    case AdminRole.ADMIN:
      return "Administrator";
    case AdminRole.MODERATOR:
      return "Moderator";
  }
}

export default async function AdminDashboardPage() {
  const admin = await requireAdmin(AdminRole.MODERATOR, "/admin/dashboard");

  return (
    <div className={styles.container}>
      {/* Navigation / Header */}
      <header className={styles.nav}>
        <div className={styles.brand}>
          <span className={styles.brandSub}>Fine Arts Club × VIT Chennai</span>
          <h1 className={styles.brandTitle}>
            Techno<span className={styles.brandAccent}>VIT</span> Admin Panel
          </h1>
        </div>

        <div className={styles.navActions}>
          <Link href="/" className="btn btn--secondary">
            View Public Gallery
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="btn btn--ghost" id="admin-logout-btn">
              Sign Out
            </button>
          </form>
        </div>
      </header>

      {/* Admin Profile Overview */}
      <section className={styles.profileCard} aria-label="Administrator profile">
        <div className={styles.profileInfo}>
          <p className={styles.profileName}>
            {admin.display_name || admin.email}
          </p>
          <p className={styles.profileEmail}>{admin.email}</p>
        </div>

        <div className={styles.badges}>
          <span className={`${styles.roleBadge} ${getRoleBadgeClass(admin.role)}`}>
            {formatRoleLabel(admin.role)}
          </span>
          <span className={styles.statusActive}>
            ● Active
          </span>
        </div>
      </section>

      {/* Planned Modules Overview */}
      <section className={styles.grid} aria-label="Management modules">
        <div className={styles.moduleCard}>
          <div className={styles.moduleHeader}>
            <span className={styles.moduleIcon} aria-hidden="true">🖼️</span>
            <span className={styles.moduleStatus}>Phase 2E</span>
          </div>
          <h2 className={styles.moduleTitle}>Moderation Queue</h2>
          <p className={styles.moduleDesc}>
            Review submitted photos, approve for public display, reject inappropriate submissions, and add moderation notes.
          </p>
        </div>

        <div className={styles.moduleCard}>
          <div className={styles.moduleHeader}>
            <span className={styles.moduleIcon} aria-hidden="true">📸</span>
            <span className={styles.moduleStatus}>Phase 2E</span>
          </div>
          <h2 className={styles.moduleTitle}>Photo Management</h2>
          <p className={styles.moduleDesc}>
            Browse, search, filter, edit metadata, and manage approved and archived gallery photographs.
          </p>
        </div>

        <div className={styles.moduleCard}>
          <div className={styles.moduleHeader}>
            <span className={styles.moduleIcon} aria-hidden="true">📍</span>
            <span className={styles.moduleStatus}>Phase 2D</span>
          </div>
          <h2 className={styles.moduleTitle}>Locations & Booths</h2>
          <p className={styles.moduleDesc}>
            Configure campus event zones, photo booths, and art stations with GPS coordinates.
          </p>
        </div>

        <div className={styles.moduleCard}>
          <div className={styles.moduleHeader}>
            <span className={styles.moduleIcon} aria-hidden="true">📊</span>
            <span className={styles.moduleStatus}>Phase 2F / Phase 6</span>
          </div>
          <h2 className={styles.moduleTitle}>System & Storage Metrics</h2>
          <p className={styles.moduleDesc}>
            Monitor Cloudflare R2 storage utilization quotas, audit logs, and system error events.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <p className={styles.footerText}>
          TechnoVIT Photo Gallery Administration • Authenticated as {admin.email}
        </p>
      </footer>
    </div>
  );
}
