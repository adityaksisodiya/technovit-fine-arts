"use client";

import { useState } from "react";
import Link from "next/link";
import { CAMPUS_LOCATIONS, type CampusLocation } from "@/config/assets";
import styles from "./CampusMap.module.css";

export function CampusMap() {
  const [selectedLocation, setSelectedLocation] = useState<CampusLocation | null>(
    CAMPUS_LOCATIONS[0]
  );

  return (
    <div className={styles.mapContainer}>
      <header className={styles.mapHeader}>
        <span className="technical-tag">Campus Spaces • VIT Chennai</span>
        <h1 className={styles.mapTitle}>Explore the Campus</h1>
        <p className={styles.mapSubtitle}>
          Discover photo booths, art exhibition stations, and festival stages across the VIT Chennai grounds.
        </p>
      </header>

      {/* Blueprint Map Canvas */}
      <div className={styles.canvasWrapper} role="region" aria-label="Campus Spaces Map">
        <div className={styles.canvasBlueprint} />

        <div className={styles.compassMark}>
          VIT CHENNAI • 12.8406° N, 80.1534° E
        </div>

        <div className={styles.mapPlaceholderArt}>
          <svg width="64" height="64" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <span>TechnoVIT Spatial Blueprint Layer</span>
        </div>

        {/* Location Markers */}
        {CAMPUS_LOCATIONS.map((loc) => (
          <button
            key={loc.id}
            type="button"
            className={styles.markerPin}
            style={{
              left: `${loc.xPercent}%`,
              top: `${loc.yPercent}%`,
              color: loc.tagColor,
            }}
            onClick={() => setSelectedLocation(loc)}
            aria-label={`Select location: ${loc.name}`}
          >
            <div className={styles.markerBeacon}>📍</div>
            <span className={styles.markerLabel}>{loc.name}</span>
          </button>
        ))}

        {/* Selected Location Card */}
        {selectedLocation && (
          <div className={styles.locationCard}>
            <div className={styles.locationCardHeader}>
              <span className={styles.zoneTag}>{selectedLocation.zoneName}</span>
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
            <p className={styles.locationCardDesc}>{selectedLocation.description}</p>

            <div className={styles.locationCardActions}>
              <Link href="/#upload" className="btn btn--primary" style={{ fontSize: "11px", padding: "6px 12px" }}>
                + Drop Photo from Here
              </Link>
              <Link href="/#wall" className="btn btn--secondary" style={{ fontSize: "11px", padding: "6px 12px" }}>
                View Wall Photos
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
