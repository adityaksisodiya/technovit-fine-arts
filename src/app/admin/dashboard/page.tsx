import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin, hasRequiredRole } from "@/lib/auth/admin";
import { getModerationStats } from "@/lib/moderation";
import { AdminRole } from "@/types";
import { logoutAction } from "../actions";
import styles from "./dashboard.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Dashboard — TechnoVIT",
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
  const stats = await getModerationStats();

  const isAdminOrHigher = hasRequiredRole(admin.role, AdminRole.ADMIN);
  const isSuperAdmin = hasRequiredRole(admin.role, AdminRole.SUPER_ADMIN);

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
          <Link href="/" className="btn btn--secondary" target="_blank">
            View Public Gallery ↗
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

      {/* Active Management Modules */}
      <section className={styles.grid} aria-label="Management modules">
        {/* Moderation Queue Module */}
        <Link
          href="/admin/moderation"
          className={`${styles.moduleCard} card card--interactive`}
          id="moderation-queue-module-link"
          style={{ textDecoration: "none", color: "inherit" }}
        >
          <div className={styles.moduleHeader}>
            <span className={styles.moduleIcon} aria-hidden="true">🖼️</span>
            <span
              className={styles.moduleStatus}
              style={{
                color: stats.pendingCount > 0 ? "var(--color-accent-primary)" : "var(--color-success)",
                fontWeight: "var(--weight-bold)",
              }}
            >
              {stats.pendingCount > 0 ? `● ${stats.pendingCount} Pending Review` : "✓ All Caught Up"}
            </span>
          </div>
          <h2 className={styles.moduleTitle}>Moderation Queue</h2>
          <p className={styles.moduleDesc}>
            Review newly submitted photos, approve for public display, reject inappropriate submissions, and inspect high-res photos.
          </p>
        </Link>

        {/* Photo Management Module */}
        {isAdminOrHigher ? (
          <Link
            href="/admin/photos"
            className={`${styles.moduleCard} card card--interactive`}
            id="photo-management-module-link"
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div className={styles.moduleHeader}>
              <span className={styles.moduleIcon} aria-hidden="true">📸</span>
              <span className={styles.moduleStatus} style={{ color: "var(--color-success)" }}>
                ● Active
              </span>
            </div>
            <h2 className={styles.moduleTitle}>Photo Management</h2>
            <p className={styles.moduleDesc}>
              Browse, search, filter, edit metadata, soft delete, and inspect complete audit history of all photographs.
            </p>
          </Link>
        ) : (
          <div className={styles.moduleCard} style={{ opacity: 0.6 }}>
            <div className={styles.moduleHeader}>
              <span className={styles.moduleIcon} aria-hidden="true">📸</span>
              <span className={styles.moduleStatus}>Admin Required</span>
            </div>
            <h2 className={styles.moduleTitle}>Photo Management</h2>
            <p className={styles.moduleDesc}>
              Browse, search, filter, edit metadata, and manage approved and archived gallery photographs.
            </p>
          </div>
        )}

        {/* Storage & System Metrics Module */}
        {isAdminOrHigher ? (
          <Link
            href="/admin/metrics"
            className={`${styles.moduleCard} card card--interactive`}
            id="metrics-module-link"
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div className={styles.moduleHeader}>
              <span className={styles.moduleIcon} aria-hidden="true">📊</span>
              <span className={styles.moduleStatus} style={{ color: "var(--color-success)" }}>
                ● Active
              </span>
            </div>
            <h2 className={styles.moduleTitle}>System & Storage Metrics</h2>
            <p className={styles.moduleDesc}>
              Monitor Backblaze B2 storage capacity against the 7.5 GB hard-stop, audit logs, and trigger maintenance cleanup.
            </p>
          </Link>
        ) : (
          <div className={styles.moduleCard} style={{ opacity: 0.6 }}>
            <div className={styles.moduleHeader}>
              <span className={styles.moduleIcon} aria-hidden="true">📊</span>
              <span className={styles.moduleStatus}>Admin Required</span>
            </div>
            <h2 className={styles.moduleTitle}>System & Storage Metrics</h2>
            <p className={styles.moduleDesc}>
              Monitor Backblaze B2 storage capacity against the 7.5 GB hard-stop, audit logs, and system error events.
            </p>
          </div>
        )}

        {/* Super Admin User Management Module */}
        {isSuperAdmin && (
          <Link
            href="/admin/users"
            className={`${styles.moduleCard} card card--interactive`}
            id="user-management-module-link"
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div className={styles.moduleHeader}>
              <span className={styles.moduleIcon} aria-hidden="true">👥</span>
              <span className={styles.moduleStatus} style={{ color: "var(--color-accent-primary)" }}>
                Super Admin
              </span>
            </div>
            <h2 className={styles.moduleTitle}>Admin User Control</h2>
            <p className={styles.moduleDesc}>
              Provision new moderator and administrator accounts, modify privileges, and suspend/activate access.
            </p>
          </Link>
        )}
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
