import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { getAdminLocations } from "@/lib/map/service";
import { AdminRole } from "@/types";
import { logoutAction } from "../actions";
import { AdminMapManager } from "@/components/AdminMap";
import styles from "./map.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Campus Map & Locations — TechnoVIT Admin",
  description: "Super Admin portal for managing festival locations and interactive map markers.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminMapPage() {
  const admin = await requireAdmin(AdminRole.SUPER_ADMIN, "/admin/map");
  const locations = await getAdminLocations();

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.nav}>
        <div className={styles.brand}>
          <span className={styles.brandSub}>
            <Link href="/admin/dashboard" style={{ textDecoration: "underline" }}>
              ← Admin Dashboard
            </Link>{" "}
            • Locations
          </span>
          <h1 className={styles.brandTitle}>Campus Map Management</h1>
        </div>

        <div className={styles.navActions}>
          <Link href="/admin/dashboard" className="btn btn--secondary">
            Dashboard
          </Link>
          <Link href="/admin/photos" className="btn btn--secondary">
            Photo Management
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="btn btn--ghost" id="admin-logout-btn">
              Sign Out
            </button>
          </form>
        </div>
      </header>

      {/* Main Map Manager */}
      <main>
        <AdminMapManager initialLocations={locations} />
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <p className={styles.footerText}>
          TechnoVIT Campus Map Management • Authenticated as {admin.display_name || admin.email} ({admin.role})
        </p>
      </footer>
    </div>
  );
}
