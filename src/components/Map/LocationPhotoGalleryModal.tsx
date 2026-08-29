"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { PublicLocation, PublicPhoto } from "@/types";
import { CinematicLightbox } from "@/components/Gallery/CinematicLightbox";
import { formatPhotoDate } from "@/lib/utils/date";
import styles from "./CampusMap.module.css";

interface LocationPhotoGalleryModalProps {
  location: PublicLocation | null;
  onClose: () => void;
}

export function LocationPhotoGalleryModal({
  location,
  onClose,
}: LocationPhotoGalleryModalProps) {
  const [photos, setPhotos] = useState<PublicPhoto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activePhoto, setActivePhoto] = useState<PublicPhoto | null>(null);

  useEffect(() => {
    if (!location) return;

    let mounted = true;

    async function loadLocationPhotos() {
      try {
        const res = await fetch(`/api/photos?locationId=${encodeURIComponent(location!.id)}&limit=30`);
        if (!res.ok) {
          // Fallback to initial preview photos if any
          if (mounted) {
            setPhotos(location!.preview_photos || []);
            setLoading(false);
          }
          return;
        }

        const data = await res.json();
        if (mounted) {
          setPhotos(data.photos || []);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error fetching location photos:", err);
        if (mounted) {
          setPhotos(location!.preview_photos || []);
          setLoading(false);
        }
      }
    }

    loadLocationPhotos();

    return () => {
      mounted = false;
    };
  }, [location]);

  if (!location) return null;

  return (
    <>
      <div className={styles.modalBackdrop} onClick={onClose} role="dialog" aria-modal="true">
        <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <div>
              <span className={styles.zoneTag}>{location.category.replace("_", " ")}</span>
              <h2 className={styles.modalTitle}>{location.name}</h2>
              <span className={styles.modalSubtitle}>
                {photos.length} Approved Festival {photos.length === 1 ? "Photograph" : "Photographs"}
              </span>
            </div>
            <button type="button" className="btn btn--ghost" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>

          <div className={styles.modalBody}>
            {loading ? (
              <div style={{ textAlign: "center", padding: "var(--space-8)" }}>
                <p>Loading photographs...</p>
              </div>
            ) : photos.length === 0 ? (
              <div className={styles.emptyGalleryState}>
                <div style={{ fontSize: "2rem" }}>📸</div>
                <h3>Nothing here yet</h3>
                <p>Photos from this space will appear here. Be the first to drop a photo!</p>
                <Link href="/#upload" className="btn btn--primary" onClick={onClose}>
                  + Drop a Photo from {location.name}
                </Link>
              </div>
            ) : (
              <div className={styles.photoGrid}>
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className={styles.photoThumbCard}
                    onClick={() => setActivePhoto(photo)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setActivePhoto(photo);
                      }
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.thumbUrl}
                      alt={`Photo taken at ${location.name}`}
                      className={styles.photoThumbImg}
                      loading="lazy"
                    />
                    <span className={styles.photoDateTag}>
                      {formatPhotoDate(photo.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cinematic Fullscreen Lightbox */}
      <CinematicLightbox
        photo={activePhoto}
        allPhotos={photos}
        onClose={() => setActivePhoto(null)}
        onSelectPhoto={(p) => setActivePhoto(p)}
      />
    </>
  );
}
