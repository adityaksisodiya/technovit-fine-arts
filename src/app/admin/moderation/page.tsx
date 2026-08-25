import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { getPendingPhotos, getModerationStats } from "@/lib/moderation";
import { AdminRole } from "@/types";
import { logoutAction } from "../actions";
import { ModerationQueueList } from "@/components/ModerationQueue";
import styles from "./moderation.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Photo Moderation Queue — TechnoVIT Admin",
  description: "Review and moderate pending photo submissions for TechnoVIT.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function ModerationQueuePage() {
  const admin = await requireAdmin(AdminRole.MODERATOR, "/admin/moderation");
  const [pendingPhotos, stats] = await Promise.all([
    getPendingPhotos(),
    getModerationStats(),
  ]);

  return (
    <div className={styles.container}>
      {/* Top Navigation */}
      <header className={styles.nav}>
        <div className={styles.brand}>
          <span className={styles.brandSub}>
            <Link href="/admin/dashboard" style={{ textDecoration: "underline" }}>
              ← Admin Dashboard
            </Link>{" "}
            • Moderation
          </span>
          <h1 className={styles.brandTitle}>
            Photo Moderation Queue
            {stats.pendingCount > 0 && (
              <span className={styles.badgePendingCount}>
                {stats.pendingCount} Pending
              </span>
            )}
          </h1>
        </div>

        <div className={styles.navActions}>
          <Link href="/admin/dashboard" className="btn btn--secondary">
            Dashboard
          </Link>
          <Link href="/" className="btn btn--ghost" target="_blank">
            Public Gallery ↗
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="btn btn--ghost" id="admin-logout-btn">
              Sign Out
            </button>
          </form>
        </div>
      </header>

      {/* Queue Statistics Bar */}
      <section className={styles.statsGrid} aria-label="Moderation metrics">
        <div className={`${styles.statCard} ${styles.statPending}`}>
          <span className={styles.statLabel}>Pending Review</span>
          <span className={styles.statValue}>{stats.pendingCount}</span>
        </div>

        <div className={`${styles.statCard} ${styles.statApproved}`}>
          <span className={styles.statLabel}>Total Approved</span>
          <span className={styles.statValue}>{stats.approvedCount}</span>
        </div>

        <div className={`${styles.statCard} ${styles.statRejected}`}>
          <span className={styles.statLabel}>Total Rejected</span>
          <span className={styles.statValue}>{stats.rejectedCount}</span>
        </div>
      </section>

      {/* Interactive Moderation Queue List */}
      <main>
        <ModerationQueueList initialPhotos={pendingPhotos} />
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <p className={styles.footerText}>
          TechnoVIT Photo Moderation • Reviewing as {admin.display_name || admin.email} ({admin.role})
        </p>
      </footer>
    </div>
  );
}
