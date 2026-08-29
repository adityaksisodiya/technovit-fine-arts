"use client";

import { useState, useRef, useCallback } from "react";
import { LOCATION_CATEGORY_META } from "@/lib/map/constants";
import { updateLocationPositionAction } from "@/lib/map/actions";
import type { LocationWithCount } from "@/types";
import styles from "./AdminMap.module.css";

interface AdminMapCanvasProps {
  locations: LocationWithCount[];
  selectedLocationId: string | null;
  onSelectLocation: (loc: LocationWithCount) => void;
  onAddLocationAtCoords: (coords: { x: number; y: number }) => void;
  onRefresh: () => void;
}

export function AdminMapCanvas({
  locations,
  selectedLocationId,
  onSelectLocation,
  onAddLocationAtCoords,
  onRefresh,
}: AdminMapCanvasProps) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [draggingLocId, setDraggingLocId] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);

  // Calculates normalized (0.0 to 1.0) coordinates from PointerEvent
  const getNormalizedCoords = useCallback((e: React.PointerEvent<HTMLDivElement> | PointerEvent) => {
    if (!canvasRef.current) return { x: 0.5, y: 0.5 };
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;
    const x = Math.max(0.02, Math.min(0.98, (clientX - rect.left) / rect.width));
    const y = Math.max(0.04, Math.min(0.96, (clientY - rect.top) / rect.height));
    return {
      x: Math.round(x * 1000) / 1000,
      y: Math.round(y * 1000) / 1000,
    };
  }, []);

  // Handle canvas click to place a new location pin
  const handleCanvasClick = (e: React.PointerEvent<HTMLDivElement>) => {
    // If we just finished a drag or clicked on a marker, ignore
    if (draggingLocId) return;
    const target = e.target as HTMLElement;
    if (target.closest(`.${styles.markerPin}`)) return;

    const coords = getNormalizedCoords(e);
    onAddLocationAtCoords(coords);
  };

  // Pointer down on a marker to start dragging
  const handleMarkerPointerDown = (
    e: React.PointerEvent<HTMLButtonElement>,
    loc: LocationWithCount
  ) => {
    e.stopPropagation();
    setDraggingLocId(loc.id);
    onSelectLocation(loc);

    const initialPos = {
      x: loc.map_x ?? 0.5,
      y: loc.map_y ?? 0.5,
    };
    setDragPos(initialPos);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const coords = getNormalizedCoords(moveEvent);
      setDragPos(coords);
    };

    const handlePointerUp = async (upEvent: PointerEvent) => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);

      const finalCoords = getNormalizedCoords(upEvent);
      setDraggingLocId(null);
      setDragPos(null);

      // Persist the new position to Supabase
      await updateLocationPositionAction(loc.id, finalCoords.x, finalCoords.y);
      onRefresh();
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  return (
    <div
      ref={canvasRef}
      className={styles.canvasWrapper}
      onPointerDown={handleCanvasClick}
      aria-label="Map Canvas Editor. Click anywhere to add a location, or drag pins to reposition."
    >
      {/* Blueprint Grid Vector Background */}
      <div className={styles.canvasBlueprint} />

      {/* Editor Instructions Overlay */}
      <div className={styles.canvasCrosshairOverlay}>
        <span>📍 Click canvas to drop pin • Drag pin to reposition • Click pin to edit</span>
      </div>

      {/* Compass / Technical Mark */}
      <div
        style={{
          position: "absolute",
          top: "14px",
          right: "14px",
          fontFamily: "var(--font-mono)",
          fontSize: "9.5px",
          color: "rgba(255, 255, 255, 0.4)",
          letterSpacing: "var(--tracking-widest)",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          padding: "3px 8px",
          borderRadius: "var(--radius-xs)",
          pointerEvents: "none",
        }}
      >
        CAMPUS BLUEPRINT // NORMALIZED_COORD_MODE
      </div>

      {/* Location Pins */}
      {locations.map((loc) => {
        const isDragging = draggingLocId === loc.id;
        const posX = isDragging && dragPos ? dragPos.x : loc.map_x ?? 0.5;
        const posY = isDragging && dragPos ? dragPos.y : loc.map_y ?? 0.5;
        const isSelected = selectedLocationId === loc.id;
        const meta = LOCATION_CATEGORY_META[loc.category] || LOCATION_CATEGORY_META.custom;

        return (
          <button
            key={loc.id}
            type="button"
            className={`${styles.markerPin} ${isSelected ? styles.markerPinSelected : ""} ${
              !loc.is_active ? styles.markerDisabled : ""
            }`}
            style={{
              left: `${posX * 100}%`,
              top: `${posY * 100}%`,
            }}
            onPointerDown={(e) => handleMarkerPointerDown(e, loc)}
            onClick={(e) => {
              e.stopPropagation();
              onSelectLocation(loc);
            }}
            title={`${loc.name} (${meta.label}) - ${loc.approved_photo_count} approved photos`}
          >
            <div
              className={styles.markerBeacon}
              style={{
                backgroundColor: meta.color,
                color: "#ffffff",
                boxShadow: isSelected ? `0 0 20px ${meta.color}` : `0 0 10px ${meta.color}`,
              }}
            >
              {meta.icon}
            </div>
            <span className={styles.markerLabel}>
              {loc.name}
              {!loc.is_active && " (Disabled)"}
            </span>
          </button>
        );
      })}
    </div>
  );
}
