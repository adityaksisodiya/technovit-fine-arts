import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { getAdminPhotos } from "@/lib/admin-photos";
import { AdminRole } from "@/types";
import { logoutAction } from "../actions";
import { PhotoManagementTable } from "@/components/AdminPhotos";
import styles from "./photos.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Photo Management — TechnoVIT Admin",
  description: "Browse, filter, edit metadata, and manage gallery photographs.",
  robots: {
    index: false,
    follow: false,
  },
};

interface PhotosPageProps {
  searchParams: Promise<{
    status?: string;
    search?: string;
    sortBy?: "created_at" | "file_size_bytes";
    sortOrder?: "asc" | "desc";
    limit?: string;
    offset?: string;
  }>;
}

export default async function AdminPhotosPage({ searchParams }: PhotosPageProps) {
  const admin = await requireAdmin(AdminRole.ADMIN, "/admin/photos");
  const params = await searchParams;

  const status = params.status || "all";
  const search = params.search || "";
  const sortBy = params.sortBy || "created_at";
  const sortOrder = params.sortOrder || "desc";
  const limit = params.limit ? parseInt(params.limit, 10) : 50;
  const offset = params.offset ? parseInt(params.offset, 10) : 0;

  const result = await getAdminPhotos({
    status,
    search,
    sortBy,
    sortOrder,
    limit,
    offset,
  });

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.nav}>
        <div className={styles.brand}>
          <span className={styles.brandSub}>
            <Link href="/admin/dashboard" style={{ textDecoration: "underline" }}>
              ← Admin Dashboard
            </Link>{" "}
            • Photos
          </span>
          <h1 className={styles.brandTitle}>Photo Management</h1>
        </div>

        <div className={styles.navActions}>
          <Link href="/admin/moderation" className="btn btn--secondary">
            Moderation Queue
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
        <PhotoManagementTable
          initialPhotos={result.photos}
          totalCount={result.totalCount}
          currentStatus={status}
          currentSearch={search}
          currentSortBy={sortBy}
          currentSortOrder={sortOrder}
          currentUserRole={admin.role}
        />
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <p className={styles.footerText}>
          TechnoVIT Photo Management • Authenticated as {admin.display_name || admin.email} ({admin.role})
        </p>
      </footer>
    </div>
  );
}
