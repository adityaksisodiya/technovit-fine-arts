import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { listAdminUsers } from "@/lib/admin-users";
import { AdminRole } from "@/types";
import { logoutAction } from "../actions";
import { AdminUsersTable } from "@/components/AdminUsers";
import styles from "./users.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin User Management — TechnoVIT Admin",
  description: "Manage administrator accounts, roles, and access controls.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminUsersPage() {
  const admin = await requireAdmin(AdminRole.SUPER_ADMIN, "/admin/users");
  const users = await listAdminUsers(admin);

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.nav}>
        <div className={styles.brand}>
          <span className={styles.brandSub}>
            <Link href="/admin/dashboard" style={{ textDecoration: "underline" }}>
              ← Admin Dashboard
            </Link>{" "}
            • User Management
          </span>
          <h1 className={styles.brandTitle}>Super Admin User Control</h1>
        </div>

        <div className={styles.navActions}>
          <Link href="/admin/metrics" className="btn btn--secondary">
            Metrics
          </Link>
          <Link href="/admin/photos" className="btn btn--secondary">
            Photos
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

      {/* Main Table */}
      <main>
        <AdminUsersTable users={users} currentAdminId={admin.id} />
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <p className={styles.footerText}>
          TechnoVIT Access Control • Authenticated as Super Administrator ({admin.email})
        </p>
      </footer>
    </div>
  );
}
