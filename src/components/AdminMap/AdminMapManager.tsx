"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AdminMapCanvas } from "./AdminMapCanvas";
import { LocationListTable } from "./LocationListTable";
import { LocationFormModal } from "./LocationFormModal";
import { updateLocationPositionAction } from "@/lib/map/actions";
import { VIT_CHENNAI_COORDINATES } from "@/lib/map/constants";
import type { LocationWithCount } from "@/types";
import styles from "./AdminMap.module.css";

interface AdminMapManagerProps {
  initialLocations: LocationWithCount[];
}

export function AdminMapManager({ initialLocations }: AdminMapManagerProps) {
  const router = useRouter();
  const [locations, setLocations] = useState<LocationWithCount[]>(initialLocations);
  const [prevInitialLocations, setPrevInitialLocations] = useState<LocationWithCount[]>(initialLocations);

  if (initialLocations !== prevInitialLocations) {
    setPrevInitialLocations(initialLocations);
    setLocations(initialLocations);
  }

  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [statusToast, setStatusToast] = useState<{ type: "success" | "error"; message: string } | null>(null);


  // Auto-dismiss status toast
  useEffect(() => {
    if (!statusToast) return;
    const timer = setTimeout(() => {
      setStatusToast(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [statusToast]);

  // Modal states
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingLocation, setEditingLocation] = useState<LocationWithCount | null>(null);
  const [newCoords, setNewCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  const handleRefresh = useCallback(() => {
    router.refresh();
  }, [router]);

  // Optimistic location position update handler for marker dragging
  const handleUpdatePosition = useCallback(
    async (id: string, latitude: number, longitude: number): Promise<boolean> => {
      const target = locations.find((l) => l.id === id);
      const targetName = target?.name || "Location";
      const prevLat = target?.latitude;
      const prevLng = target?.longitude;

      // 1. Optimistically update local state immediately
      setLocations((prev) =>
        prev.map((l) =>
          l.id === id
            ? { ...l, latitude, longitude, is_demo_position: false }
            : l
        )
      );

      // 2. Persist to database via server action
      const res = await updateLocationPositionAction(id, latitude, longitude);

      if (!res.success) {
        // Rollback state on failure
        setLocations((prev) =>
          prev.map((l) =>
            l.id === id
              ? { ...l, latitude: prevLat ?? l.latitude, longitude: prevLng ?? l.longitude }
              : l
          )
        );
        setStatusToast({
          type: "error",
          message: res.error || `Failed to save position for "${targetName}".`,
        });
        return false;
      }

      setStatusToast({
        type: "success",
        message: `Saved position for "${targetName}" (${latitude.toFixed(6)}° N, ${longitude.toFixed(6)}° E).`,
      });

      handleRefresh();
      return true;
    },
    [locations, handleRefresh]
  );

  const handleOpenAddModal = (coords?: { latitude: number; longitude: number }) => {
    setEditingLocation(null);
    setNewCoords(coords || { latitude: VIT_CHENNAI_COORDINATES.latitude, longitude: VIT_CHENNAI_COORDINATES.longitude });
    setModalOpen(true);
  };

  const handleOpenEditModal = (loc: LocationWithCount) => {
    setEditingLocation(loc);
    setNewCoords(null);
    setSelectedLocationId(loc.id);
    setModalOpen(true);
  };

  return (
    <div className={styles.container}>
      {/* Top Toolbar */}
      <div className={styles.toolbar}>
        <div>
          <h2 className={styles.toolbarTitle}>
            <span>🗺️ Super Admin Map Management</span>
          </h2>
          <p className={styles.toolbarHint}>
            {locations.length} Campus Location(s) Configured • Drag pins on map to reposition or click to add
          </p>
        </div>

        <button
          type="button"
          className="btn btn--primary"
          onClick={() => handleOpenAddModal()}
        >
          + Add Location
        </button>
      </div>

      {/* Status Toast Banner */}
      {statusToast && (
        <div
          style={{
            padding: "var(--space-3) var(--space-4)",
            borderRadius: "var(--radius-md)",
            fontSize: "var(--text-xs)",
            fontFamily: "var(--font-techno)",
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor:
              statusToast.type === "success" ? "rgba(46, 204, 113, 0.15)" : "rgba(231, 76, 60, 0.15)",
            border: `1px solid ${
              statusToast.type === "success" ? "var(--color-status-approved)" : "var(--color-status-rejected)"
            }`,
            color:
              statusToast.type === "success" ? "var(--color-status-approved)" : "var(--color-status-rejected)",
          }}
        >
          <span>
            {statusToast.type === "success" ? "✓ " : "✕ "}
            {statusToast.message}
          </span>
          <button
            type="button"
            className="btn btn--ghost"
            style={{ padding: "0 6px", fontSize: "11px", minHeight: "24px" }}
            onClick={() => setStatusToast(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Interactive Map Canvas Editor */}
      <AdminMapCanvas
        locations={locations}
        selectedLocationId={selectedLocationId}
        onSelectLocation={(loc) => {
          setSelectedLocationId(loc.id);
          handleOpenEditModal(loc);
        }}
        onAddLocationAtCoords={(coords) => handleOpenAddModal(coords)}
        onUpdatePosition={handleUpdatePosition}
      />


      {/* Location Roster Table */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-base)" }}>
          Configured Campus Locations
        </h3>
        <LocationListTable
          locations={locations}
          onEditLocation={handleOpenEditModal}
          onRefresh={handleRefresh}
        />
      </div>

      {/* Form Modal */}
      {modalOpen && (
        <LocationFormModal
          initialLocation={editingLocation}
          initialCoords={newCoords}
          onClose={() => setModalOpen(false)}
          onSuccess={() => {
            setModalOpen(false);
            handleRefresh();
          }}
        />
      )}
    </div>
  );
}

