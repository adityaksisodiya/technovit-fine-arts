"use client";

import { useEffect, useState } from "react";
import type { PhotoDetailData } from "@/lib/admin-photos";
import { getPhotoDetailsAction, updatePhotoStatusAction, purgePhotoAction } from "@/app/admin/photos/actions";
import { PhotoStatus, AdminRole } from "@/types";
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

  useEffect(() => {
    if (!photoId) return;

    let mounted = true;

    async function loadData() {
      try {
        const res = await getPhotoDetailsAction(photoId!);
        if (mounted) {
          setData(res);
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

  const handlePurge = async () => {
    if (!confirm("Are you sure you want to PERMANENTLY delete this photo and purge all B2 storage objects? This cannot be undone.")) {
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

              {/* Moderation History */}
              <div className={styles.timelineSection}>
                <h3 className={styles.timelineTitle}>Moderation History</h3>
                {data.history.length === 0 ? (
                  <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-tertiary)" }}>
                    No moderation history recorded yet.
                  </p>
                ) : (
                  data.history.map((h) => (
                    <div key={h.id} className={styles.timelineItem}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <strong>{h.action.toUpperCase()} ({h.previous_status} → {h.new_status})</strong>
                        <span>{new Date(h.created_at).toLocaleString()}</span>
                      </div>
                      {h.reason && <p style={{ fontStyle: "italic" }}>Reason: &quot;{h.reason}&quot;</p>}
                      <span style={{ color: "var(--color-text-secondary)" }}>
                        By: {h.admin_name || h.admin_email || h.admin_id || "System"}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Audit Logs */}
              <div className={styles.timelineSection}>
                <h3 className={styles.timelineTitle}>Audit Logs</h3>
                {data.auditLogs.length === 0 ? (
                  <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-tertiary)" }}>
                    No audit log entries found.
                  </p>
                ) : (
                  data.auditLogs.map((a) => (
                    <div key={a.id} className={styles.timelineItem}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <strong>{a.action}</strong>
                        <span>{new Date(a.created_at).toLocaleString()}</span>
                      </div>
                      <span style={{ color: "var(--color-text-secondary)" }}>
                        Actor: {a.admin_email || a.admin_id || "System"} | IP: {a.ip_address || "N/A"}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : null}
        </div>

        <div className={styles.modalFooter}>
          {data && (
            <>
              {data.photo.status !== PhotoStatus.APPROVED && (
                <button
                  type="button"
                  className="btn btn--secondary"
                  disabled={actionLoading}
                  onClick={() => handleStatusUpdate(PhotoStatus.APPROVED)}
                >
                  ✓ Approve Photo
                </button>
              )}

              {data.photo.status !== PhotoStatus.REJECTED && !showRejectInput && (
                <button
                  type="button"
                  className="btn btn--secondary"
                  disabled={actionLoading}
                  onClick={() => setShowRejectInput(true)}
                >
                  ✕ Reject Photo
                </button>
              )}

              {data.photo.status !== PhotoStatus.DELETED && (
                <button
                  type="button"
                  className="btn btn--ghost"
                  disabled={actionLoading}
                  onClick={() => handleStatusUpdate(PhotoStatus.DELETED, "Admin soft-deleted")}
                >
                  Soft Delete
                </button>
              )}

              {isSuperAdmin && (
                <button
                  type="button"
                  className="btn btn--ghost"
                  style={{ color: "var(--color-error)" }}
                  disabled={actionLoading}
                  onClick={handlePurge}
                >
                  Purge from B2 & DB
                </button>
              )}
            </>
          )}

          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
