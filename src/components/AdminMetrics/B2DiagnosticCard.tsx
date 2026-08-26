"use client";

import { useState } from "react";
import type { B2DiagnosticResult } from "@/lib/metrics";
import { runAbandonedUploadCleanupAction, type CleanupActionResult } from "@/app/admin/actions";
import styles from "./AdminMetrics.module.css";

interface B2DiagnosticCardProps {
  b2Diagnostic: B2DiagnosticResult;
}

export function B2DiagnosticCard({ b2Diagnostic }: B2DiagnosticCardProps) {
  const [cleaning, setCleaning] = useState<boolean>(false);
  const [cleanupResult, setCleanupResult] = useState<CleanupActionResult | null>(null);

  const handleCleanup = async () => {
    setCleaning(true);
    setCleanupResult(null);
    const res = await runAbandonedUploadCleanupAction(30);
    setCleaning(false);
    setCleanupResult(res);
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>
          <span>☁️</span> Backblaze B2 & Operations
        </h2>
        <span
          className={`${styles.diagValue} ${
            b2Diagnostic.connected ? styles.statusConnected : styles.statusDisconnected
          }`}
        >
          {b2Diagnostic.connected ? "● Connected" : "● Offline"}
        </span>
      </div>

      <div className={styles.diagList}>
        <div className={styles.diagItem}>
          <span className={styles.diagLabel}>Storage Provider:</span>
          <span className={styles.diagValue}>Backblaze B2 (S3 Compatible)</span>
        </div>
        <div className={styles.diagItem}>
          <span className={styles.diagLabel}>Bucket Name:</span>
          <span className={styles.diagValue}>{b2Diagnostic.bucketName}</span>
        </div>
        <div className={styles.diagItem}>
          <span className={styles.diagLabel}>Region:</span>
          <span className={styles.diagValue}>{b2Diagnostic.region}</span>
        </div>
        <div className={styles.diagItem}>
          <span className={styles.diagLabel}>API Latency:</span>
          <span className={styles.diagValue}>{b2Diagnostic.latencyMs} ms</span>
        </div>
      </div>

      {b2Diagnostic.error && (
        <p className="form-error" style={{ fontSize: "var(--text-xs)" }}>
          Diagnostic Error: {b2Diagnostic.error}
        </p>
      )}

      {/* Abandoned Upload Cleanup Trigger */}
      <div style={{ paddingTop: "var(--space-2)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)" }}>
              Abandoned Upload Recovery
            </p>
            <p style={{ fontSize: "11px", color: "var(--color-text-tertiary)" }}>
              Purge pending uploads older than 30m with no confirmation.
            </p>
          </div>
          <button
            type="button"
            className="btn btn--secondary"
            style={{ fontSize: "11px", padding: "6px 12px" }}
            disabled={cleaning}
            onClick={handleCleanup}
          >
            {cleaning ? "Cleaning..." : "Run Cleanup Now"}
          </button>
        </div>

        {cleanupResult && (
          <div
            style={{
              padding: "var(--space-2)",
              borderRadius: "var(--radius-md)",
              backgroundColor: cleanupResult.success ? "rgba(62, 142, 65, 0.1)" : "rgba(209, 67, 67, 0.1)",
              fontSize: "11px",
              color: cleanupResult.success ? "var(--color-success)" : "var(--color-error)",
            }}
          >
            {cleanupResult.success
              ? `✓ Cleanup completed: ${cleanupResult.deletedCount} abandoned records removed.`
              : `✕ Cleanup failed: ${cleanupResult.error}`}
          </div>
        )}
      </div>
    </div>
  );
}
