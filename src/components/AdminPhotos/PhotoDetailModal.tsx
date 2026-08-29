"use client";

import { useEffect, useState } from "react";
import type { PhotoDetailData } from "@/lib/admin-photos";
import {
  getPhotoDetailsAction,
  updatePhotoStatusAction,
  purgePhotoAction,
  getAvailableLocationsAction,
  updatePhotoLocationAction,
} from "@/app/admin/photos/actions";
import { PhotoStatus, AdminRole, type LocationWithCount } from "@/types";
import styles from "./PhotoManagement.module.css";

interface PhotoDetailModalProps {
  photoId: string | null;
  currentUserRole: AdminRole;
  onClose: () => void;
  onRefresh: () => void;
}

export function PhotoDetailModal({
  photoId,
  currentUserRole,
  onClose,
  onRefresh,
}: PhotoDetailModalProps) {
  const [data, setData] = useState<PhotoDetailData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>("");
  const [showRejectInput, setShowRejectInput] = useState<boolean>(false);

  // Location assignment state
  const [locations, setLocations] = useState<LocationWithCount[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [locationSaving, setLocationSaving] = useState<boolean>(false);
  const [locationFeedback, setLocationFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!photoId) return;

    let mounted = true;

    async function loadData() {
      try {
        const [photoRes, locsRes] = await Promise.all([
          getPhotoDetailsAction(photoId!),
          getAvailableLocationsAction(),
        ]);

        if (mounted) {
          setData(photoRes);
          setLocations(locsRes || []);
          setSelectedLocationId(photoRes?.photo.location_id || "");
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to load details");
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, [photoId]);

  if (!photoId) return null;

  const handleStatusUpdate = async (newStatus: PhotoStatus, reason?: string) => {
    setActionLoading(true);
    setError(null);
    const res = await updatePhotoStatusAction(photoId, newStatus, reason);
    setActionLoading(false);

    if (res.success) {
      onRefresh();
      onClose();
    } else {
      setError(res.error || "Action failed");
    }
  };

  const handleLocationSave = async () => {
    setLocationSaving(true);
    setLocationFeedback(null);
    const targetLoc = selectedLocationId ? selectedLocationId : null;
    const res = await updatePhotoLocationAction(photoId, targetLoc);
    setLocationSaving(false);

    if (res.success) {
      setLocationFeedback("Location updated successfully.");
      onRefresh();
    } else {
      setError(res.error || "Failed to update location");
    }
  };

  const handlePurge = async () => {
    if (
      !confirm(
        "Are you sure you want to PERMANENTLY delete this photo and purge all B2 storage objects? This cannot be undone."
      )
    ) {
      return;
    }
    setActionLoading(true);
    setError(null);
    const res = await purgePhotoAction(photoId);
    setActionLoading(false);

    if (res.success) {
      onRefresh();
      onClose();
    } else {
      setError(res.error || "Purge failed");
    }
  };

  const isSuperAdmin = currentUserRole === AdminRole.SUPER_ADMIN;

  return (
    <div className={styles.modalBackdrop} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Photo Details & Audit Trail</h2>
          <button type="button" className="btn btn--ghost" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className={styles.modalBody}>
          {loading ? (
            <p>Loading photo details...</p>
          ) : error ? (
            <p className="form-error">{error}</p>
          ) : data ? (
            <>
              <div className={styles.detailGrid}>
                {/* Image Preview */}
                <div className={styles.modalPreviewWrapper}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/admin/photos/${data.photo.id}/preview?variant=display`}
                    alt="Inspection Preview"
                    className={styles.modalPreviewImg}
                  />
                </div>

                {/* Metadata List */}
                <div className={styles.metaList}>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Photo ID:</span>
                    <span className={styles.metaVal}>{data.photo.id}</span>
                  </div>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Status:</span>
                    <span className={styles.metaVal}>{data.photo.status}</span>
                  </div>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Dimensions:</span>
                    <span className={styles.metaVal}>
                      {data.photo.width && data.photo.height
                        ? `${data.photo.width} × ${data.photo.height} px`
                        : "N/A"}
                    </span>
                  </div>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Total Stored Size:</span>
                    <span className={styles.metaVal}>
                      {data.photo.file_size_bytes
                        ? `${(data.photo.file_size_bytes / 1024).toFixed(1)} KB`
                        : "N/A"}
                    </span>
                  </div>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Current Location:</span>
                    <span className={styles.metaVal}>
                      {data.photo.location_name || "Unassigned"}
                    </span>
                  </div>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Uploaded IP:</span>
                    <span className={styles.metaVal}>{data.photo.uploaded_from_ip || "N/A"}</span>
                  </div>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Uploaded At:</span>
                    <span className={styles.metaVal}>
                      {new Date(data.photo.created_at).toLocaleString()}
                    </span>
                  </div>
                  {data.photo.moderated_at && (
                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>Moderated At:</span>
                      <span className={styles.metaVal}>
                        {new Date(data.photo.moderated_at).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {data.photo.moderator_name && (
                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>Moderated By:</span>
                      <span className={styles.metaVal}>{data.photo.moderator_name}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Photo-Location Association Selector */}
              <div
                style={{
                  backgroundColor: "var(--color-bg-primary)",
                  padding: "var(--space-4)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-border)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-2)",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-techno)",
                    fontSize: "var(--text-xs)",
                    fontWeight: "bold",
                    textTransform: "uppercase",
                    letterSpacing: "var(--tracking-wider)",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  🗺️ Assign Campus Location
                </span>
                <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
                  <select
                    className="select"
                    value={selectedLocationId}
                    onChange={(e) => setSelectedLocationId(e.target.value)}
                    style={{ flex: 1, minWidth: "200px" }}
                  >
                    <option value="">-- No Location (Unassigned) --</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} {loc.is_active ? "" : "(Disabled)"}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn--secondary"
                    disabled={locationSaving}
                    onClick={handleLocationSave}
                  >
                    {locationSaving ? "Saving..." : "Save Location"}
                  </button>
                </div>
                {locationFeedback && (
                  <span style={{ fontSize: "11px", color: "var(--color-success)" }}>
                    {locationFeedback}
                  </span>
                )}
              </div>

              {/* Rejection input prompt */}
              {showRejectInput && (
                <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
                  <input
                    type="text"
                    placeholder="Optional rejection reason..."
                    className="input"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn btn--primary"
                    disabled={actionLoading}
                    onClick={() => handleStatusUpdate(PhotoStatus.REJECTED, rejectReason)}
                  >
                    Confirm Rejection
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => setShowRejectInput(false)}
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Status Actions */}
              <div className={styles.modalActions}>
                {data.photo.status !== PhotoStatus.APPROVED && (
                  <button
                    type="button"
                    className="btn btn--primary"
                    disabled={actionLoading}
                    onClick={() => handleStatusUpdate(PhotoStatus.APPROVED)}
                  >
                    Approve Photo
                  </button>
                )}

                {data.photo.status !== PhotoStatus.REJECTED && !showRejectInput && (
                  <button
                    type="button"
                    className="btn btn--secondary"
                    disabled={actionLoading}
                    onClick={() => setShowRejectInput(true)}
                  >
                    Reject Photo...
                  </button>
                )}

                {data.photo.status !== PhotoStatus.DELETED && (
                  <button
                    type="button"
                    className="btn btn--ghost"
                    disabled={actionLoading}
                    onClick={() => handleStatusUpdate(PhotoStatus.DELETED, "Soft deleted by admin")}
                  >
                    Soft Delete
                  </button>
                )}

                {data.photo.status === PhotoStatus.DELETED && (
                  <button
                    type="button"
                    className="btn btn--secondary"
                    disabled={actionLoading}
                    onClick={() => handleStatusUpdate(PhotoStatus.APPROVED, "Restored by admin")}
                  >
                    Restore
                  </button>
                )}

                {isSuperAdmin && (
                  <button
                    type="button"
                    className="btn btn--danger"
                    disabled={actionLoading}
                    onClick={handlePurge}
                    style={{ marginLeft: "auto" }}
                  >
                    Permanent Purge
                  </button>
                )}
              </div>

              {/* Moderation History Table */}
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>Moderation History</h3>
              </div>
              {data.history.length === 0 ? (
                <p className={styles.emptyNote}>No moderation events recorded yet.</p>
              ) : (
                <div className={styles.subTableWrapper}>
                  <table className={styles.subTable}>
                    <thead>
                      <tr>
                        <th>Action</th>
                        <th>Transition</th>
                        <th>Admin</th>
                        <th>Reason</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.history.map((h) => (
                        <tr key={h.id}>
                          <td>
                            <strong>{h.action}</strong>
                          </td>
                          <td>
                            {h.previous_status} → {h.new_status}
                          </td>
                          <td>{h.admin_name || h.admin_email || "System"}</td>
                          <td>{h.reason || "—"}</td>
                          <td>{new Date(h.created_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Audit Log Table */}
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>Audit Log Entries</h3>
              </div>
              {data.auditLogs.length === 0 ? (
                <p className={styles.emptyNote}>No audit log entries for this photo.</p>
              ) : (
                <div className={styles.subTableWrapper}>
                  <table className={styles.subTable}>
                    <thead>
                      <tr>
                        <th>Action</th>
                        <th>IP Address</th>
                        <th>Admin</th>
                        <th>Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.auditLogs.map((a) => (
                        <tr key={a.id}>
                          <td>{a.action}</td>
                          <td>{a.ip_address || "—"}</td>
                          <td>{a.admin_email || "System"}</td>
                          <td>{new Date(a.created_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
