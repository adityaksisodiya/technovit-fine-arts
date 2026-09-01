"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  AttributionControl,
  setWorkerUrl,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  DEFAULT_MAP_STYLE,
  VIT_CHENNAI_CENTER,
  MAP_ZOOM_CONFIG,
  MAP_ATTRIBUTION,
  isWebGLSupported,
} from "@/lib/map/constants";
import type { PublicLocation } from "@/types";
import { LocationPhotoGalleryModal } from "./LocationPhotoGalleryModal";
import styles from "./CampusMap.module.css";

// Configure self-hosted Web Worker for MapLibre GL JS v6
if (typeof window !== "undefined") {
  setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
}

interface CampusMapProps {
  initialLocations?: PublicLocation[];
}

export function CampusMap({ initialLocations = [] }: CampusMapProps) {
  const [locations, setLocations] = useState<PublicLocation[]>(initialLocations);
  const [prevInitialLocations, setPrevInitialLocations] = useState<PublicLocation[]>(initialLocations);

  if (initialLocations !== prevInitialLocations) {
    setPrevInitialLocations(initialLocations);
    setLocations(initialLocations);
  }

  const [selectedLocation, setSelectedLocation] = useState<PublicLocation | null>(null);
  const [galleryLocation, setGalleryLocation] = useState<PublicLocation | null>(null);
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<{ marker: Marker; locationId: string; element: HTMLElement }[]>([]);

  // Handler to select and smoothly fly map to a location
  const handleSelectLocation = useCallback((loc: PublicLocation) => {
    setSelectedLocation(loc);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.easeTo({
        center: [loc.longitude, loc.latitude],
        zoom: Math.max(mapInstanceRef.current.getZoom(), 17.5),
        duration: 800,
        essential: true,
      });
    }
  }, []);

  // Recenter map view to VIT Chennai campus center
  const handleRecenter = useCallback(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo({
        center: VIT_CHENNAI_CENTER,
        zoom: MAP_ZOOM_CONFIG.initial,
        essential: true,
      });
    }
  }, []);

  // 1. Initialize MapLibre GL instance
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Check WebGL capability
    if (!isWebGLSupported()) {
      setTimeout(() => {
        setMapError("WebGL is not supported in this browser or hardware acceleration is disabled.");
      }, 0);
      return;
    }

    try {
      const map = new MapLibreMap({
        container: mapContainerRef.current,
        style: DEFAULT_MAP_STYLE,
        center: VIT_CHENNAI_CENTER,
        zoom: MAP_ZOOM_CONFIG.initial,
        minZoom: MAP_ZOOM_CONFIG.min,
        maxZoom: MAP_ZOOM_CONFIG.max,
        attributionControl: false,
      });

      // Add navigation controls (zoom in/out, compass)
      map.addControl(
        new NavigationControl({
          showCompass: true,
          showZoom: true,
          visualizePitch: true,
        }),
        "top-right"
      );

      // Add custom attribution complying with OpenFreeMap and OpenStreetMap ODbL
      map.addControl(
        new AttributionControl({
          compact: false,
          customAttribution: MAP_ATTRIBUTION,
        }),
        "bottom-right"
      );

      const handleReady = () => {
        setMapLoaded(true);
        setMapError(null);
        map.resize();
      };

      map.on("load", handleReady);
      map.on("style.load", handleReady);

      map.on("error", (e) => {
        if (e && e.error) {
          console.warn("MapLibre event warning:", e.error);
        }
      });

      mapInstanceRef.current = map;

      // Ensure canvas dimensions synchronize immediately with DOM layout
      requestAnimationFrame(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.resize();
        }
      });

      // Safety fallback timer to gracefully dismiss loading overlay
      const fallbackTimer = setTimeout(() => {
        setMapLoaded(true);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.resize();
        }
      }, 2500);

      // Cleanly handle window or element resizing
      const resizeObserver = new ResizeObserver(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.resize();
        }
      });
      if (mapContainerRef.current) {
        resizeObserver.observe(mapContainerRef.current);
      }

      // Cleanup on unmount to prevent duplicate WebGL contexts and memory leaks
      return () => {
        clearTimeout(fallbackTimer);
        resizeObserver.disconnect();
        markersRef.current.forEach(({ marker }) => marker.remove());
        markersRef.current = [];
        map.remove();
        mapInstanceRef.current = null;
      };
    } catch (err: unknown) {
      console.error("Map initialization exception:", err);
      setTimeout(() => {
        setMapError(err instanceof Error ? err.message : "Failed to initialize MapLibre GL instance");
      }, 0);
    }
  }, []);

  // 2. Render and sync custom pulsing terracotta markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing markers
    markersRef.current.forEach(({ marker }) => marker.remove());
    markersRef.current = [];

    // Create markers for active campus locations
    locations.forEach((loc) => {
      const isSelected = selectedLocation?.id === loc.id;

      // Custom DOM Element for marker (clean terracotta glowing beacon)
      const el = document.createElement("button");
      el.type = "button";
      el.className = `${styles.customMarkerPin} ${isSelected ? styles.markerSelected : ""}`;
      el.setAttribute("aria-label", `${loc.name} — ${loc.approved_photo_count} photos`);
      el.title = loc.name;

      const beacon = document.createElement("div");
      beacon.className = styles.markerBeacon;

      const dot = document.createElement("div");
      dot.className = styles.markerCoreDot;
      beacon.appendChild(dot);

      el.appendChild(beacon);

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        handleSelectLocation(loc);
      });

      const marker = new Marker({
        element: el,
        anchor: "center",
      })
        .setLngLat([loc.longitude, loc.latitude])
        .addTo(map);

      markersRef.current.push({ marker, locationId: loc.id, element: el });
    });
  }, [locations, selectedLocation, handleSelectLocation]);

  return (
    <div className={styles.mapContainer}>
      <header className={styles.mapHeader}>
        <span className="technical-tag">Campus Spaces • VIT Chennai</span>
        <h1 className={styles.mapTitle}>Explore the Campus</h1>
        <p className={styles.mapSubtitle}>
          Discover festival locations and photo memories across VIT Chennai.
        </p>
      </header>

      {/* Interactive MapLibre Canvas Container */}
      <div
        className={styles.canvasWrapper}
        role="region"
        aria-label="Interactive VIT Chennai Campus Map. Click marker pins to inspect location photos."
      >
        <div ref={mapContainerRef} className={styles.maplibreCanvas} />

        {/* Map Loading / Diagnostic Error Overlay */}
        {mapError ? (
          <div className={styles.mapLoadingOverlay} style={{ padding: "var(--space-6)", textAlign: "center" }}>
            <span style={{ fontSize: "28px" }}>⚠️</span>
            <span style={{ color: "var(--color-accent-primary)", fontWeight: "bold" }}>Map Initialization Issue</span>
            <span style={{ fontSize: "12px", color: "var(--color-text-secondary)", maxWidth: "360px" }}>{mapError}</span>
            <button
              type="button"
              className="btn btn--secondary"
              style={{ fontSize: "11px", padding: "6px 12px", marginTop: "var(--space-2)" }}
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        ) : !mapLoaded ? (
          <div className={styles.mapLoadingOverlay}>
            <div className={styles.mapLoadingSpinner} />
            <span>Loading VIT Chennai Map...</span>
          </div>
        ) : null}

        {/* Recenter Campus Button */}
        <button
          type="button"
          className={styles.recenterControl}
          onClick={handleRecenter}
          aria-label="Recenter Map on VIT Chennai"
          title="Recenter view on campus"
        >
          <span>🎯</span>
          <span>Recenter Campus</span>
        </button>

        {/* Technical Coordinate Badge */}
        <div className={styles.compassMark}>
          VIT CHENNAI • 12.8406° N, 80.1534° E
        </div>

        {/* Selected Location Card / Popover */}
        {selectedLocation && (
          <div className={styles.locationCard}>
            <div className={styles.locationCardHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                <span className={styles.zoneTag}>
                  Campus Space
                </span>
                {selectedLocation.is_demo_position && (
                  <span className={styles.demoTag}>Demo Placement</span>
                )}
              </div>
              <button
                type="button"
                className="btn btn--ghost"
                style={{ padding: "0 4px", fontSize: "12px", minHeight: "28px" }}
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

            <div style={{ fontSize: "11px", color: "var(--color-text-secondary)", fontFamily: "var(--font-mono)", marginBottom: "var(--space-3)" }}>
              📸 {selectedLocation.approved_photo_count} photo{selectedLocation.approved_photo_count === 1 ? "" : "s"} captured here
            </div>

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
                View Photos ({selectedLocation.approved_photo_count}) →
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
