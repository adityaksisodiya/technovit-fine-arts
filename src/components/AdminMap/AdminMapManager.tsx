"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminMapCanvas } from "./AdminMapCanvas";
import { LocationListTable } from "./LocationListTable";
import { LocationFormModal } from "./LocationFormModal";
import type { LocationWithCount } from "@/types";
import styles from "./AdminMap.module.css";

interface AdminMapManagerProps {
  initialLocations: LocationWithCount[];
}

export function AdminMapManager({ initialLocations }: AdminMapManagerProps) {
  const router = useRouter();
  const [locations] = useState<LocationWithCount[]>(initialLocations);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);

  // Modal states
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingLocation, setEditingLocation] = useState<LocationWithCount | null>(null);
  const [newCoords, setNewCoords] = useState<{ x: number; y: number } | null>(null);

  const handleRefresh = () => {
    router.refresh();
  };

  const handleOpenAddModal = (coords?: { x: number; y: number }) => {
    setEditingLocation(null);
    setNewCoords(coords || { x: 0.5, y: 0.5 });
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
            {initialLocations.length} Campus Location(s) Configured • Drag pins on canvas to reposition
          </p>
        </div>

        <button
          type="button"
          className="btn btn--primary"
          onClick={() => handleOpenAddModal({ x: 0.5, y: 0.5 })}
        >
          + Add Location
        </button>
      </div>

      {/* Interactive Map Canvas Editor */}
      <AdminMapCanvas
        locations={locations}
        selectedLocationId={selectedLocationId}
        onSelectLocation={(loc) => {
          setSelectedLocationId(loc.id);
          handleOpenEditModal(loc);
        }}
        onAddLocationAtCoords={(coords) => handleOpenAddModal(coords)}
        onRefresh={handleRefresh}
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
