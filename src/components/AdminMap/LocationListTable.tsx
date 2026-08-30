"use client";

import { useState } from "react";
import { toggleLocationStatusAction, deleteLocationAction } from "@/lib/map/actions";
import type { LocationWithCount } from "@/types";
import styles from "./AdminMap.module.css";

interface LocationListTableProps {
  locations: LocationWithCount[];
  onEditLocation: (loc: LocationWithCount) => void;
  onRefresh: () => void;
}

export function LocationListTable({
  locations,
  onEditLocation,
  onRefresh,
}: LocationListTableProps) {
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleToggle = async (loc: LocationWithCount) => {
    setBusyId(loc.id);
    await toggleLocationStatusAction(loc.id, !loc.is_active);
    setBusyId(null);
    onRefresh();
  };

  const handleDelete = async (loc: LocationWithCount) => {
    const promptMessage =
      loc.total_photo_count > 0
        ? `Are you sure you want to delete "${loc.name}"? ${loc.total_photo_count} associated photo(s) will have their location unassigned, but NO photos will be deleted.`
        : `Are you sure you want to delete "${loc.name}"?`;

    if (!confirm(promptMessage)) return;

    setBusyId(loc.id);
    await deleteLocationAction(loc.id);
    setBusyId(null);
    onRefresh();
  };

  if (locations.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--color-text-tertiary)" }}>
        <p>No locations created yet. Click anywhere on the map canvas above or click &quot;+ Add Location&quot;.</p>
      </div>
    );
  }

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th}>Title</th>
            <th className={styles.th}>Coordinates (Lat, Lng)</th>
            <th className={styles.th}>Photos</th>
            <th className={styles.th}>Status</th>
            <th className={styles.th} style={{ textAlign: "right" }}>
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {locations.map((loc) => {
            const isBusy = busyId === loc.id;

            return (
              <tr key={loc.id} style={{ opacity: isBusy ? 0.6 : 1 }}>
                <td className={styles.td}>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <strong style={{ fontSize: "var(--text-sm)" }}>{loc.name}</strong>
                    {loc.description && (
                      <span style={{ fontSize: "11px", color: "var(--color-text-tertiary)", maxWidth: "260px" }}>
                        {loc.description}
                      </span>
                    )}
                  </div>
                </td>


                <td className={styles.td} style={{ fontFamily: "var(--font-mono)", fontSize: "11px" }}>
                  <div>
                    {typeof loc.latitude === "number" ? loc.latitude.toFixed(5) : "—"}° N,{" "}
                    {typeof loc.longitude === "number" ? loc.longitude.toFixed(5) : "—"}° E
                  </div>
                  {loc.is_demo_position && (
                    <span
                      style={{
                        display: "inline-block",
                        fontSize: "9px",
                        color: "var(--color-warning)",
                        marginTop: "2px",
                      }}
                    >
                      (Demo placement)
                    </span>
                  )}
                </td>

                <td className={styles.td}>
                  <span style={{ fontWeight: "bold" }}>{loc.approved_photo_count}</span>
                  <span style={{ color: "var(--color-text-tertiary)", fontSize: "10px" }}>
                    {" "}(of {loc.total_photo_count} total)
                  </span>
                </td>

                <td className={styles.td}>
                  <button
                    type="button"
                    onClick={() => handleToggle(loc)}
                    disabled={isBusy}
                    className="badge"
                    style={{
                      cursor: "pointer",
                      backgroundColor: loc.is_active ? "rgba(74, 124, 89, 0.15)" : "rgba(220, 38, 38, 0.15)",
                      color: loc.is_active ? "var(--color-success)" : "var(--color-error)",
                      border: `1px solid ${loc.is_active ? "var(--color-success)" : "var(--color-error)"}`,
                    }}
                  >
                    {loc.is_active ? "● Active" : "○ Disabled"}
                  </button>
                </td>

                <td className={styles.td} style={{ textAlign: "right" }}>
                  <div className={styles.actionsGroup} style={{ justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      className="btn btn--secondary"
                      onClick={() => onEditLocation(loc)}
                      disabled={isBusy}
                      style={{ padding: "4px 8px", fontSize: "11px" }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn--danger"
                      onClick={() => handleDelete(loc)}
                      disabled={isBusy}
                      style={{ padding: "4px 8px", fontSize: "11px" }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
