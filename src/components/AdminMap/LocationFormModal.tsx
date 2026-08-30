"use client";

import { useState } from "react";
import { VIT_CHENNAI_COORDINATES } from "@/lib/map/constants";
import { createLocationAction, updateLocationAction } from "@/lib/map/actions";
import type { Location, LocationCategory, LocationWithCount } from "@/types";
import styles from "./AdminMap.module.css";

interface LocationFormModalProps {
  initialLocation: Location | LocationWithCount | null;
  initialCoords?: { latitude: number; longitude: number } | null;
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
  const category: LocationCategory = initialLocation?.category || "custom";
  const [latitude, setLatitude] = useState<number>(
    initialLocation?.latitude ?? initialCoords?.latitude ?? VIT_CHENNAI_COORDINATES.latitude
  );

  const [longitude, setLongitude] = useState<number>(
    initialLocation?.longitude ?? initialCoords?.longitude ?? VIT_CHENNAI_COORDINATES.longitude
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
    formData.append("latitude", latitude.toString());
    formData.append("longitude", longitude.toString());
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
              Location Title *
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
            <label className={styles.formLabel} htmlFor="loc-desc">
              Details (Optional)
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
              <label className={styles.formLabel} htmlFor="loc-lat">
                Latitude (° N)
              </label>
              <input
                id="loc-lat"
                type="number"
                step="0.000001"
                min="-90"
                max="90"
                className="input"
                value={latitude}
                onChange={(e) => setLatitude(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className={styles.formGroup} style={{ flex: 1 }}>
              <label className={styles.formLabel} htmlFor="loc-lng">
                Longitude (° E)
              </label>
              <input
                id="loc-lng"
                type="number"
                step="0.000001"
                min="-180"
                max="180"
                className="input"
                value={longitude}
                onChange={(e) => setLongitude(parseFloat(e.target.value) || 0)}
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

