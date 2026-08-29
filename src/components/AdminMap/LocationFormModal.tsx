"use client";

import { useState } from "react";
import { LOCATION_CATEGORY_META } from "@/lib/map/constants";
import { createLocationAction, updateLocationAction } from "@/lib/map/actions";
import type { Location, LocationCategory, LocationWithCount } from "@/types";
import styles from "./AdminMap.module.css";

interface LocationFormModalProps {
  initialLocation: Location | LocationWithCount | null;
  initialCoords?: { x: number; y: number } | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function LocationFormModal({
  initialLocation,
  initialCoords,
  onClose,
  onSuccess,
}: LocationFormModalProps) {
  const isEditing = Boolean(initialLocation?.id);

  const [name, setName] = useState<string>(initialLocation?.name || "");
  const [description, setDescription] = useState<string>(initialLocation?.description || "");
  const [category, setCategory] = useState<LocationCategory>(
    initialLocation?.category || "custom"
  );
  const [mapX, setMapX] = useState<number>(
    initialLocation?.map_x ?? initialCoords?.x ?? 0.5
  );
  const [mapY, setMapY] = useState<number>(
    initialLocation?.map_y ?? initialCoords?.y ?? 0.5
  );
  const [isActive, setIsActive] = useState<boolean>(
    initialLocation ? initialLocation.is_active : true
  );

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData();
    if (isEditing && initialLocation?.id) {
      formData.append("id", initialLocation.id);
    }
    formData.append("name", name.trim());
    formData.append("description", description.trim());
    formData.append("category", category);
    formData.append("map_x", mapX.toString());
    formData.append("map_y", mapY.toString());
    formData.append("is_active", isActive ? "true" : "false");

    try {
      const res = isEditing
        ? await updateLocationAction(null, formData)
        : await createLocationAction(null, formData);

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.error || "Operation failed");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.modalBackdrop} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            {isEditing ? `Edit Location: ${initialLocation?.name}` : "Add Campus Location"}
          </h2>
          <button type="button" className="btn btn--ghost" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {error && <p className="form-error">{error}</p>}

          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="loc-name">
              Location Name *
            </label>
            <input
              id="loc-name"
              type="text"
              className="input"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Photo Booth 1, Main Stage"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="loc-category">
              Category
            </label>
            <select
              id="loc-category"
              className="select"
              value={category}
              onChange={(e) => setCategory(e.target.value as LocationCategory)}
            >
              {Object.entries(LOCATION_CATEGORY_META).map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.icon} {meta.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="loc-desc">
              Description (Optional)
            </label>
            <textarea
              id="loc-desc"
              className="input"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short note about what happens at this spot..."
            />
          </div>

          <div style={{ display: "flex", gap: "var(--space-3)" }}>
            <div className={styles.formGroup} style={{ flex: 1 }}>
              <label className={styles.formLabel} htmlFor="loc-map-x">
                Canvas X (0.0 - 1.0)
              </label>
              <input
                id="loc-map-x"
                type="number"
                step="0.001"
                min="0"
                max="1"
                className="input"
                value={mapX}
                onChange={(e) => setMapX(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className={styles.formGroup} style={{ flex: 1 }}>
              <label className={styles.formLabel} htmlFor="loc-map-y">
                Canvas Y (0.0 - 1.0)
              </label>
              <input
                id="loc-map-y"
                type="number"
                step="0.001"
                min="0"
                max="1"
                className="input"
                value={mapY}
                onChange={(e) => setMapY(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginTop: "var(--space-2)" }}>
            <input
              id="loc-active"
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            <label htmlFor="loc-active" style={{ fontSize: "var(--text-xs)", cursor: "pointer" }}>
              Active (Visible on public interactive map)
            </label>
          </div>

          <div className={styles.modalActions}>
            <button type="button" className="btn btn--secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={loading}>
              {loading ? "Saving..." : isEditing ? "Update Location" : "Create Location"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
