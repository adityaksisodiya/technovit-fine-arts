"use client";

import React from "react";
import Image from "next/image";
import type { Photo } from "@/types";
import styles from "./ModerationQueue.module.css";

interface ModerationCardProps {
  photo: Photo;
  isProcessing: boolean;
  onApprove: (photoId: string) => void;
  onRejectClick: (photo: Photo) => void;
  onInspect: (photo: Photo) => void;
}

export function ModerationCard({
  photo,
  isProcessing,
  onApprove,
  onRejectClick,
  onInspect,
}: ModerationCardProps) {
  const thumbUrl = `/api/admin/photos/${photo.id}/preview?variant=thumb`;

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  return (
    <article
      className={`${styles.card} ${isProcessing ? styles.busy : ""}`}
      id={`moderation-card-${photo.id}`}
    >
      <div
        className={styles.thumbnailWrapper}
        onClick={() => onInspect(photo)}
        role="button"
        tabIndex={0}
        aria-label="Click to enlarge photo"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onInspect(photo);
          }
        }}
      >
        <Image
          src={thumbUrl}
          alt="Pending photo submission"
          className={styles.thumbnailImg}
          width={photo.width ? Math.min(photo.width, 400) : 400}
          height={photo.height ? Math.min(photo.height, 300) : 300}
          unoptimized
        />
        <div className={styles.zoomHint} aria-hidden="true">
          <span>🔍 Enlarge</span>
        </div>
      </div>

      <div className={styles.cardBody}>
        <div className={styles.metadataGrid}>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Uploaded</span>
            <span className={styles.metaValue}>
              {formatTimestamp(photo.created_at)}
            </span>
          </div>

          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Dimensions</span>
            <span className={styles.metaValue}>
              {photo.width && photo.height
                ? `${photo.width} × ${photo.height}`
                : "—"}
            </span>
          </div>

          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Total Storage</span>
            <span className={styles.metaValue}>
              {formatFileSize(photo.file_size_bytes)}
            </span>
          </div>

          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Client IP</span>
            <span className={styles.metaValue}>
              {photo.uploaded_from_ip ? (
                <span className={styles.ipBadge}>{photo.uploaded_from_ip}</span>
              ) : (
                "—"
              )}
            </span>
          </div>
        </div>

        <div className={styles.cardActions}>
          <button
            type="button"
            className={styles.btnApprove}
            onClick={() => onApprove(photo.id)}
            disabled={isProcessing}
            aria-label={`Approve photo ${photo.id}`}
            id={`approve-btn-${photo.id}`}
          >
            {isProcessing ? "Saving..." : "✓ Approve"}
          </button>

          <button
            type="button"
            className={styles.btnReject}
            onClick={() => onRejectClick(photo)}
            disabled={isProcessing}
            aria-label={`Reject photo ${photo.id}`}
            id={`reject-btn-${photo.id}`}
          >
            ✕ Reject
          </button>
        </div>
      </div>
    </article>
  );
}
