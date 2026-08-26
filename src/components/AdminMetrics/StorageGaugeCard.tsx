"use client";

import type { StorageMetrics } from "@/lib/metrics";
import styles from "./AdminMetrics.module.css";

interface StorageGaugeCardProps {
  storage: StorageMetrics;
}

export function StorageGaugeCard({ storage }: StorageGaugeCardProps) {
  let barClass = styles.barNormal;
  if (storage.statusLevel === "warning") barClass = styles.barWarning;
  if (storage.statusLevel === "critical") barClass = styles.barCritical;

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>
          <span>💾</span> Storage Capacity (7.5 GB Hard-Stop)
        </h2>
        <span
          className="badge"
          style={{
            backgroundColor:
              storage.statusLevel === "critical"
                ? "rgba(209, 67, 67, 0.2)"
                : storage.statusLevel === "warning"
                ? "rgba(196, 85, 58, 0.2)"
                : "rgba(62, 142, 65, 0.2)",
            color:
              storage.statusLevel === "critical"
                ? "var(--color-error)"
                : storage.statusLevel === "warning"
                ? "var(--color-accent-primary)"
                : "var(--color-success)",
            fontWeight: "var(--weight-bold)",
          }}
        >
          {storage.usedPercentage.toFixed(1)}% Utilized
        </span>
      </div>

      <div className={styles.storageProgressTrack}>
        <div
          className={`${styles.storageProgressBar} ${barClass}`}
          style={{ width: `${Math.min(100, storage.usedPercentage)}%` }}
        />
      </div>

      <div className={styles.storageStatsRow}>
        <div>
          <span>Reserved: </span>
          <span className={styles.storageHighlight}>{storage.formattedUsed}</span>
        </div>
        <div>
          <span>Remaining: </span>
          <span className={styles.storageHighlight}>{storage.formattedRemaining}</span>
        </div>
        <div>
          <span>Hard-Stop: </span>
          <span className={styles.storageHighlight}>{storage.formattedHardStop}</span>
        </div>
      </div>

      {storage.statusLevel !== "normal" && (
        <p
          style={{
            fontSize: "var(--text-xs)",
            color: storage.statusLevel === "critical" ? "var(--color-error)" : "var(--color-accent-primary)",
            fontWeight: "var(--weight-semibold)",
          }}
        >
          {storage.statusLevel === "critical"
            ? "⚠️ Storage is above 90% capacity! New photo uploads will be halted at 7.5 GB."
            : "⚠️ Storage is above 70% capacity."}
        </p>
      )}
    </div>
  );
}
