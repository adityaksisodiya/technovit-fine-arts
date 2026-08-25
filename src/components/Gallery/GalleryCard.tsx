"use client";

import { useState } from "react";
import type { PublicPhoto } from "@/lib/gallery";
import { BlurhashCanvas } from "./BlurhashCanvas";
import styles from "./Gallery.module.css";

interface GalleryCardProps {
  photo: PublicPhoto;
  onSelect: (photo: PublicPhoto) => void;
  priority?: boolean;
}

/**
 * Individual gallery photo card rendered within the masonry layout.
 * Features smooth Blurhash placeholder transitions, hover zoom overlay, and keyboard accessibility.
 */
export function GalleryCard({ photo, onSelect, priority = false }: GalleryCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  const aspectRatio =
    photo.width && photo.height
      ? `${photo.width} / ${photo.height}`
      : "1 / 1";

  const formattedDate = new Date(photo.created_at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  return (
    <div
      className={styles.card}
      style={{ aspectRatio }}
      onClick={() => onSelect(photo)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(photo);
        }
      }}
      aria-label="View photo in full resolution"
    >
      {/* Blurhash Placeholder */}
      {!imageLoaded && photo.blurhash && (
        <div className={styles.cardBlurhash}>
          <BlurhashCanvas blurhash={photo.blurhash} width={32} height={32} />
        </div>
      )}

      {/* Optimized Thumbnail Image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.thumbUrl}
        alt="TechnoVIT Festival Photograph"
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        className={`${styles.cardImage} ${imageLoaded ? styles.cardImageVisible : ""}`}
        onLoad={() => setImageLoaded(true)}
      />

      {/* Hover Information Overlay */}
      <div className={styles.cardOverlay}>
        <div className={styles.cardOverlayContent}>
          <span className={styles.cardDate}>{formattedDate}</span>
          <span className={styles.cardActionHint}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 3 21 3 21 9"/>
              <polyline points="9 21 3 21 3 15"/>
              <line x1="21" y1="3" x2="14" y2="10"/>
              <line x1="3" y1="21" x2="10" y2="14"/>
            </svg>
            <span>Expand</span>
          </span>
        </div>
      </div>
    </div>
  );
}
