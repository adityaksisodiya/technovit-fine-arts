"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { LOCATION_CATEGORY_META } from "@/lib/map/constants";
import type { PublicLocation, LocationCategory } from "@/types";
import { LocationPhotoGalleryModal } from "./LocationPhotoGalleryModal";
import styles from "./CampusMap.module.css";

interface CampusMapProps {
  initialLocations?: PublicLocation[];
}

export function CampusMap({ initialLocations = [] }: CampusMapProps) {
  const [locations] = useState<PublicLocation[]>(initialLocations);
  const [selectedLocation, setSelectedLocation] = useState<PublicLocation | null>(
    locations.length > 0 ? locations[0] : null
  );
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [galleryLocation, setGalleryLocation] = useState<PublicLocation | null>(null);

  // Filter locations by active category
  const filteredLocations = useMemo(() => {
    if (activeCategory === "all") return locations;
    return locations.filter((l) => l.category === activeCategory);
  }, [locations, activeCategory]);

  // Unique categories present in active locations
  const availableCategories = useMemo(() => {
    const set = new Set<LocationCategory>();
    for (const loc of locations) {
      if (loc.category) set.add(loc.category);
    }
    return Array.from(set);
  }, [locations]);

  return (
    <div className={styles.mapContainer}>
      <header className={styles.mapHeader}>
        <span className="technical-tag">Campus Spaces • VIT Chennai</span>
        <h1 className={styles.mapTitle}>Explore the Campus</h1>
        <p className={styles.mapSubtitle}>
          Discover photo booths, art exhibition stations, and festival stages across the VIT Chennai grounds.
        </p>
      </header>

      {/* Category Filter Chips */}
      {availableCategories.length > 1 && (
        <nav className={styles.categoryFilterBar} aria-label="Filter locations by category">
          <button
            type="button"
            className={`${styles.categoryFilterChip} ${
              activeCategory === "all" ? styles.categoryFilterChipActive : ""
            }`}
            onClick={() => setActiveCategory("all")}
          >
            All Spaces ({locations.length})
          </button>

          {availableCategories.map((catKey) => {
            const meta = LOCATION_CATEGORY_META[catKey] || LOCATION_CATEGORY_META.custom;
            const count = locations.filter((l) => l.category === catKey).length;
            const isActive = activeCategory === catKey;

            return (
              <button
                key={catKey}
                type="button"
                className={`${styles.categoryFilterChip} ${
                  isActive ? styles.categoryFilterChipActive : ""
                }`}
                onClick={() => setActiveCategory(catKey)}
              >
                <span>{meta.icon}</span>
                <span>{meta.label}</span>
                <span style={{ opacity: 0.7, fontSize: "10px" }}>({count})</span>
              </button>
            );
          })}
        </nav>
      )}

      {/* Blueprint Map Canvas */}
      <div className={styles.canvasWrapper} role="region" aria-label="Campus Spaces Map">
        <div className={styles.canvasBlueprint} />

        <div className={styles.compassMark}>
          VIT CHENNAI • 12.8406° N, 80.1534° E
        </div>

        <div className={styles.mapPlaceholderArt}>
          <svg width="56" height="56" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
            />
          </svg>
          <span>TechnoVIT Spatial Blueprint Layer</span>
        </div>

        {/* Location Markers */}
        {filteredLocations.map((loc) => {
          const meta = LOCATION_CATEGORY_META[loc.category] || LOCATION_CATEGORY_META.custom;
          const isSelected = selectedLocation?.id === loc.id;

          return (
            <button
              key={loc.id}
              type="button"
              className={`${styles.markerPin} ${isSelected ? styles.markerPinActive : ""}`}
              style={{
                left: `${loc.map_x * 100}%`,
                top: `${loc.map_y * 100}%`,
                color: meta.color,
              }}
              onClick={() => setSelectedLocation(loc)}
              aria-label={`Select location: ${loc.name}`}
            >
              <div
                className={styles.markerBeacon}
                style={{
                  backgroundColor: meta.color,
                  boxShadow: isSelected
                    ? `0 0 20px ${meta.color}`
                    : `0 0 12px ${meta.color}`,
                }}
              >
                {meta.icon}
              </div>
              <span className={styles.markerLabel}>{loc.name}</span>
            </button>
          );
        })}

        {/* Selected Location Card */}
        {selectedLocation && (
          <div className={styles.locationCard}>
            <div className={styles.locationCardHeader}>
              <span className={styles.zoneTag}>
                {LOCATION_CATEGORY_META[selectedLocation.category]?.label || "Festival Space"}
              </span>
              <button
                type="button"
                className="btn btn--ghost"
                style={{ padding: "0 4px", fontSize: "12px" }}
                onClick={() => setSelectedLocation(null)}
                aria-label="Close location detail"
              >
                ✕
              </button>
            </div>

            <h3 className={styles.locationCardTitle}>{selectedLocation.name}</h3>
            {selectedLocation.description && (
              <p className={styles.locationCardDesc}>{selectedLocation.description}</p>
            )}

            {/* Preview Thumbnails */}
            {selectedLocation.preview_photos && selectedLocation.preview_photos.length > 0 && (
              <div className={styles.previewRow}>
                {selectedLocation.preview_photos.map((p) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={p.id}
                    src={p.thumbUrl}
                    alt={`Preview from ${selectedLocation.name}`}
                    className={styles.previewThumb}
                    onClick={() => setGalleryLocation(selectedLocation)}
                  />
                ))}
              </div>
            )}

            <div className={styles.locationCardActions}>
              <button
                type="button"
                className="btn btn--primary"
                style={{ fontSize: "11px", padding: "6px 12px" }}
                onClick={() => setGalleryLocation(selectedLocation)}
              >
                View Photos ({selectedLocation.approved_photo_count})
              </button>
              <Link
                href="/#upload"
                className="btn btn--secondary"
                style={{ fontSize: "11px", padding: "6px 12px" }}
              >
                + Drop Photo Here
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Location Photo Gallery Modal */}
      {galleryLocation && (
        <LocationPhotoGalleryModal
          location={galleryLocation}
          onClose={() => setGalleryLocation(null)}
        />
      )}
    </div>
  );
}
