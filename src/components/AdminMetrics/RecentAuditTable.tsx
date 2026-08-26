"use client";

import type { AuditEventItem } from "@/lib/metrics";
import styles from "./AdminMetrics.module.css";

interface RecentAuditTableProps {
  auditLogs: AuditEventItem[];
}

export function RecentAuditTable({ auditLogs }: RecentAuditTableProps) {
  return (
    <div className={styles.card} style={{ gridColumn: "1 / -1" }}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>
          <span>📜</span> Recent System & Administrative Events
        </h2>
        <span className="badge badge--neutral">Latest {auditLogs.length} Events</span>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className={styles.auditTable}>
          <thead>
            <tr>
              <th className={styles.auditTh}>Action</th>
              <th className={styles.auditTh}>Entity</th>
              <th className={styles.auditTh}>Entity ID</th>
              <th className={styles.auditTh}>Admin Email</th>
              <th className={styles.auditTh}>Client IP</th>
              <th className={styles.auditTh}>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {auditLogs.length === 0 ? (
              <tr>
                <td colSpan={6} className={styles.auditTd} style={{ textAlign: "center", color: "var(--color-text-tertiary)" }}>
                  No recent audit log records.
                </td>
              </tr>
            ) : (
              auditLogs.map((log) => (
                <tr key={log.id}>
                  <td className={styles.auditTd} style={{ fontWeight: "var(--weight-semibold)" }}>
                    {log.action}
                  </td>
                  <td className={styles.auditTd}>{log.entity_type}</td>
                  <td className={styles.auditTd} style={{ fontFamily: "monospace" }}>
                    {log.entity_id ? `${log.entity_id.slice(0, 8)}...` : "—"}
                  </td>
                  <td className={styles.auditTd}>{log.admin_email || log.admin_id || "System"}</td>
                  <td className={styles.auditTd}>{log.ip_address || "—"}</td>
                  <td className={styles.auditTd}>
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
