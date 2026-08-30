"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  AttributionControl,
  setWorkerUrl,
  type MapMouseEvent,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  DEFAULT_MAP_STYLE,
  VIT_CHENNAI_CENTER,
  MAP_ZOOM_CONFIG,
  MAP_ATTRIBUTION,
  isWebGLSupported,
} from "@/lib/map/constants";
import type { LocationWithCount } from "@/types";
import styles from "./AdminMap.module.css";

// Configure self-hosted Web Worker for MapLibre GL JS v6
if (typeof window !== "undefined") {
  setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
}

interface AdminMapCanvasProps {
  locations: LocationWithCount[];
  selectedLocationId: string | null;
  onSelectLocation: (loc: LocationWithCount) => void;
  onAddLocationAtCoords: (coords: { latitude: number; longitude: number }) => void;
  onUpdatePosition: (id: string, latitude: number, longitude: number) => Promise<boolean>;
}

export function AdminMapCanvas({
  locations,
  selectedLocationId,
  onSelectLocation,
  onAddLocationAtCoords,
  onUpdatePosition,
}: AdminMapCanvasProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<{ marker: Marker; locationId: string }[]>([]);
  const isDraggingRef = useRef<boolean>(false);
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);
  const [mapError, setMapError] = useState<string | null>(null);

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
          console.warn("Admin MapLibre warning:", e.error);
        }
      });

      // Click on canvas to drop a new pin and open Add Location modal
      map.on("click", (e: MapMouseEvent) => {
        // If a marker was just dragged, ignore map click
        if (isDraggingRef.current) {
          isDraggingRef.current = false;
          return;
        }

        const originalTarget = e.originalEvent.target as HTMLElement;
        if (originalTarget.closest(`.${styles.customMarkerPin}`)) {
          return;
        }

        const lat = Math.round(e.lngLat.lat * 1000000) / 1000000;
        const lng = Math.round(e.lngLat.lng * 1000000) / 1000000;

        onAddLocationAtCoords({
          latitude: lat,
          longitude: lng,
        });
      });

      mapInstanceRef.current = map;

      // Sync size immediately
      requestAnimationFrame(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.resize();
        }
      });

      // Safety timeout: ensure loading state dismisses once tiles start rendering
      const fallbackTimer = setTimeout(() => {
        setMapLoaded(true);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.resize();
        }
      }, 2500);

      // Handle container resizing cleanly
      const resizeObserver = new ResizeObserver(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.resize();
        }
      });
      if (mapContainerRef.current) {
        resizeObserver.observe(mapContainerRef.current);
      }

      // Cleanup on unmount
      return () => {
        clearTimeout(fallbackTimer);
        resizeObserver.disconnect();
        markersRef.current.forEach(({ marker }) => marker.remove());
        markersRef.current = [];
        map.remove();
        mapInstanceRef.current = null;
      };
    } catch (err: unknown) {
      console.error("Admin map initialization exception:", err);
      setTimeout(() => {
        setMapError(err instanceof Error ? err.message : "Failed to initialize MapLibre GL");
      }, 0);
    }
  }, [onAddLocationAtCoords]);

  // 2. Render and sync draggable markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing markers
    markersRef.current.forEach(({ marker }) => marker.remove());
    markersRef.current = [];

    locations.forEach((loc) => {
      const isSelected = selectedLocationId === loc.id;

      // Custom draggable marker DOM element
      const el = document.createElement("div");
      el.className = `${styles.customMarkerPin} ${isSelected ? styles.markerSelected : ""} ${
        !loc.is_active ? styles.markerDisabled : ""
      }`;
      el.title = `${loc.name} • Drag to reposition, click to edit`;

      const beacon = document.createElement("div");
      beacon.className = styles.markerBeacon;

      const dot = document.createElement("div");
      dot.className = styles.markerCoreDot;
      beacon.appendChild(dot);

      const label = document.createElement("span");
      label.className = styles.markerLabel;
      label.innerText = loc.name + (!loc.is_active ? " (Disabled)" : "");

      el.appendChild(beacon);
      el.appendChild(label);


      // Handle marker click to edit
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        if (isDraggingRef.current) {
          isDraggingRef.current = false;
          return;
        }
        onSelectLocation(loc);
      });

      const lat = loc.latitude ?? VIT_CHENNAI_CENTER[1];
      const lng = loc.longitude ?? VIT_CHENNAI_CENTER[0];

      const marker = new Marker({
        element: el,
        draggable: true,
        anchor: "center",
      })
        .setLngLat([lng, lat])
        .addTo(map);

      // Drag event listeners
      marker.on("dragstart", () => {
        isDraggingRef.current = true;
      });

      marker.on("dragend", async () => {
        const lngLat = marker.getLngLat();
        const newLat = Math.round(lngLat.lat * 1000000) / 1000000;
        const newLng = Math.round(lngLat.lng * 1000000) / 1000000;
        const oldLat = loc.latitude ?? VIT_CHENNAI_CENTER[1];
        const oldLng = loc.longitude ?? VIT_CHENNAI_CENTER[0];

        const success = await onUpdatePosition(loc.id, newLat, newLng);

        if (!success) {
          marker.setLngLat([oldLng, oldLat]);
        }

        // Brief timeout to avoid click trigger after dragend
        setTimeout(() => {
          isDraggingRef.current = false;
        }, 150);
      });

      markersRef.current.push({ marker, locationId: loc.id });
    });
  }, [locations, selectedLocationId, onSelectLocation, onUpdatePosition]);




  return (
    <div
      className={styles.canvasWrapper}
      role="region"
      aria-label="Map Canvas Editor. Click anywhere on the map to add a location, or drag pins to reposition."
    >
      <div ref={mapContainerRef} className={styles.maplibreCanvas} />

      {/* Loading / Error Overlay */}
      {mapError ? (
        <div className={styles.mapLoadingOverlay} style={{ padding: "var(--space-6)", textAlign: "center" }}>
          <span style={{ fontSize: "24px" }}>⚠️</span>
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
          <span>Loading Admin Map Editor...</span>
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

      {/* Editor Instructions Overlay */}
      <div className={styles.canvasCrosshairOverlay}>
        <span>📍 Click map to drop pin • Drag pin to reposition • Click pin to edit</span>
      </div>
    </div>
  );
}

