"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { AdminPhotoItem } from "@/lib/admin-photos";
import { PhotoStatus, AdminRole } from "@/types";
import { PhotoDetailModal } from "./PhotoDetailModal";
import styles from "./PhotoManagement.module.css";

interface PhotoManagementTableProps {
  initialPhotos: AdminPhotoItem[];
  totalCount: number;
  currentStatus: string;
  currentSearch: string;
  currentSortBy: string;
  currentSortOrder: string;
  currentUserRole: AdminRole;
}

export function PhotoManagementTable({
  initialPhotos,
  totalCount,
  currentStatus,
  currentSearch,
  currentSortBy,
  currentSortOrder,
  currentUserRole,
}: PhotoManagementTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState<string>(currentSearch);

  const updateFilters = (newParams: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, val] of Object.entries(newParams)) {
      if (val === null || val === "" || (key === "status" && val === "all")) {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    }
    startTransition(() => {
      router.push(`/admin/photos?${params.toString()}`);
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ search: searchInput.trim() || null });
  };

  const getStatusBadge = (status: PhotoStatus) => {
    switch (status) {
      case PhotoStatus.APPROVED:
        return <span className={`${styles.statusBadge} ${styles.statusApproved}`}>Approved</span>;
      case PhotoStatus.PENDING:
        return <span className={`${styles.statusBadge} ${styles.statusPending}`}>Pending</span>;
      case PhotoStatus.REJECTED:
        return <span className={`${styles.statusBadge} ${styles.statusRejected}`}>Rejected</span>;
      case PhotoStatus.DELETED:
        return <span className={`${styles.statusBadge} ${styles.statusDeleted}`}>Deleted</span>;
      default:
        return <span className={styles.statusBadge}>{status}</span>;
    }
  };

  return (
    <div className={styles.container}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        {/* Status Tabs */}
        <div className={styles.filterGroup}>
          {["all", "pending", "approved", "rejected", "deleted"].map((st) => (
            <button
              key={st}
              type="button"
              className={`${styles.filterTab} ${
                currentStatus === st || (!currentStatus && st === "all")
                  ? styles.filterTabActive
                  : ""
              }`}
              onClick={() => updateFilters({ status: st })}
            >
              {st.charAt(0).toUpperCase() + st.slice(1)}
            </button>
          ))}
        </div>

        {/* Sort & Search Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
          <select
            className="input"
            style={{ fontSize: "var(--text-xs)", padding: "var(--space-2)" }}
            value={`${currentSortBy}-${currentSortOrder}`}
            onChange={(e) => {
              const [sortBy, sortOrder] = e.target.value.split("-");
              updateFilters({ sortBy, sortOrder });
            }}
          >
            <option value="created_at-desc">Newest First</option>
            <option value="created_at-asc">Oldest First</option>
            <option value="file_size_bytes-desc">Largest Stored Size</option>
          </select>

          {/* Search */}
          <form onSubmit={handleSearchSubmit} className={styles.searchGroup}>
            <input
              type="text"
              placeholder="Search by ID or IP..."
              className={`input ${styles.searchInput}`}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <button type="submit" className="btn btn--secondary" disabled={isPending}>
              Search
            </button>
            {currentSearch && (
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => {
                  setSearchInput("");
                  updateFilters({ search: null });
                }}
              >
                Reset
              </button>
            )}
          </form>
        </div>
      </div>

      {/* Table */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Preview</th>
              <th className={styles.th}>Photo ID</th>
              <th className={styles.th}>Status</th>
              <th className={styles.th}>Uploaded At</th>
              <th className={styles.th}>Dimensions</th>
              <th className={styles.th}>Stored Size</th>
              <th className={styles.th}>Moderator</th>
              <th className={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {initialPhotos.length === 0 ? (
              <tr>
                <td colSpan={8} className={styles.td} style={{ textAlign: "center", padding: "var(--space-8)" }}>
                  No photos found matching your criteria.
                </td>
              </tr>
            ) : (
              initialPhotos.map((photo) => (
                <tr key={photo.id} className={styles.tr}>
                  <td className={styles.td}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/admin/photos/${photo.id}/preview?variant=thumb`}
                      alt="Thumbnail"
                      className={styles.thumbImg}
                      onClick={() => setSelectedPhotoId(photo.id)}
                    />
                  </td>
                  <td className={styles.td} style={{ fontFamily: "monospace" }}>
                    {photo.id.slice(0, 8)}...
                  </td>
                  <td className={styles.td}>{getStatusBadge(photo.status)}</td>
                  <td className={styles.td}>
                    {new Date(photo.created_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className={styles.td}>
                    {photo.width && photo.height ? `${photo.width} × ${photo.height}` : "—"}
                  </td>
                  <td className={styles.td}>
                    {photo.file_size_bytes
                      ? `${(photo.file_size_bytes / 1024).toFixed(0)} KB`
                      : "—"}
                  </td>
                  <td className={styles.td}>
                    {photo.moderator_name || photo.moderator_email || (photo.moderated_by ? "Admin" : "—")}
                  </td>
                  <td className={styles.td}>
                    <div className={styles.actionsCell}>
                      <button
                        type="button"
                        className="btn btn--secondary"
                        style={{ fontSize: "11px", padding: "4px 8px" }}
                        onClick={() => setSelectedPhotoId(photo.id)}
                      >
                        Inspect & Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
        <span>Showing {initialPhotos.length} of {totalCount} total photographs</span>
      </div>

      {/* Detail Modal */}
      <PhotoDetailModal
        photoId={selectedPhotoId}
        currentUserRole={currentUserRole}
        onClose={() => setSelectedPhotoId(null)}
        onRefresh={() => {
          startTransition(() => {
            router.refresh();
          });
        }}
      />
    </div>
  );
}
