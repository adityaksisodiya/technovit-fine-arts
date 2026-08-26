import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { getSystemAndStorageMetrics } from "@/lib/metrics";
import { AdminRole } from "@/types";
import { logoutAction } from "../actions";
import {
  StorageGaugeCard,
  PhotoStatsGrid,
  B2DiagnosticCard,
  RecentAuditTable,
} from "@/components/AdminMetrics";
import styles from "./metrics.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "System & Storage Metrics — TechnoVIT Admin",
  description: "Monitor B2 storage utilization, traffic activity, diagnostics, and audit logs.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminMetricsPage() {
  const admin = await requireAdmin(AdminRole.ADMIN, "/admin/metrics");
  const metrics = await getSystemAndStorageMetrics();

  return (
    <div className={styles.container}>
      {/* Navigation / Header */}
      <header className={styles.nav}>
        <div className={styles.brand}>
          <span className={styles.brandSub}>
            <Link href="/admin/dashboard" style={{ textDecoration: "underline" }}>
              ← Admin Dashboard
            </Link>{" "}
            • Metrics
          </span>
          <h1 className={styles.brandTitle}>System & Storage Metrics</h1>
        </div>

        <div className={styles.navActions}>
          <Link href="/admin/photos" className="btn btn--secondary">
            Photos
          </Link>
          <Link href="/admin/moderation" className="btn btn--secondary">
            Moderation
          </Link>
          <Link href="/admin/dashboard" className="btn btn--secondary">
            Dashboard
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="btn btn--ghost" id="admin-logout-btn">
              Sign Out
            </button>
          </form>
        </div>
      </header>

      {/* Main Content */}
      <main className={styles.metricsGrid}>
        {/* Storage Bar Card */}
        <StorageGaugeCard storage={metrics.storage} />

        {/* Photo Traffic Grid */}
        <PhotoStatsGrid photos={metrics.photos} uploads={metrics.uploads} />

        {/* B2 Diagnostic & Cleanup */}
        <B2DiagnosticCard b2Diagnostic={metrics.b2Diagnostic} />

        {/* Recent Audit Table */}
        <RecentAuditTable auditLogs={metrics.recentAuditLogs} />
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <p className={styles.footerText}>
          System Diagnostic Snapshot generated at {new Date(metrics.timestamp).toLocaleString()} • Authenticated as {admin.email}
        </p>
      </footer>
    </div>
  );
}
