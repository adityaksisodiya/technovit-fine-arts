"use client";

import type { PhotoCounts, UploadMetrics } from "@/lib/metrics";
import styles from "./AdminMetrics.module.css";

interface PhotoStatsGridProps {
  photos: PhotoCounts;
  uploads: UploadMetrics;
}

export function PhotoStatsGrid({ photos, uploads }: PhotoStatsGridProps) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>
          <span>📸</span> Photos & Upload Traffic
        </h2>
        <span className="badge badge--neutral">Live Stats</span>
      </div>

      <div className={styles.countsGrid}>
        <div className={styles.countBox}>
          <span className={styles.countNum} style={{ color: "var(--color-accent-primary)" }}>
            {photos.pending}
          </span>
          <span className={styles.countLabel}>Pending</span>
        </div>

        <div className={styles.countBox}>
          <span className={styles.countNum} style={{ color: "var(--color-success)" }}>
            {photos.approved}
          </span>
          <span className={styles.countLabel}>Approved</span>
        </div>

        <div className={styles.countBox}>
          <span className={styles.countNum} style={{ color: "var(--color-error)" }}>
            {photos.rejected}
          </span>
          <span className={styles.countLabel}>Rejected</span>
        </div>

        <div className={styles.countBox}>
          <span className={styles.countNum}>{photos.total}</span>
          <span className={styles.countLabel}>Total Photos</span>
        </div>
      </div>

      <div className={styles.storageStatsRow} style={{ paddingTop: "var(--space-2)" }}>
        <div>
          <span>Past Hour Uploads: </span>
          <span className={styles.storageHighlight}>{uploads.uploadsLast1Hour}</span>
        </div>
        <div>
          <span>Past 24h Uploads: </span>
          <span className={styles.storageHighlight}>{uploads.uploadsLast24Hours}</span>
        </div>
        <div>
          <span>Active IPs (15m): </span>
          <span className={styles.storageHighlight}>{uploads.activeIpsInWindow}</span>
        </div>
      </div>
    </div>
  );
}
