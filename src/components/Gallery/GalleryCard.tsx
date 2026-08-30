"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const markLoaded = useCallback(() => {
    setImageLoaded(true);
    setHasError(false);
  }, []);

  const markError = useCallback(() => {
    setHasError(true);
    setImageLoaded(false);
  }, []);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    if (img.complete && img.naturalWidth > 0) {
      setImageLoaded(true);
      setHasError(false);
      return;
    }

    if (typeof img.decode === "function") {
      img
        .decode()
        .then(() => {
          setImageLoaded(true);
          setHasError(false);
        })
        .catch(() => {
          if (img.complete && img.naturalWidth > 0) {
            setImageLoaded(true);
            setHasError(false);
          }
        });
    }
  }, [photo.thumbUrl]);

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
      onClick={() => !hasError && onSelect(photo)}
      role={hasError ? undefined : "button"}
      tabIndex={hasError ? -1 : 0}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !hasError) {
          e.preventDefault();
          onSelect(photo);
        }
      }}
      aria-label="View photo in full resolution"
    >
      {/* Blurhash Placeholder */}
      {photo.blurhash && !hasError && (
        <div
          className={styles.cardBlurhash}
          style={{
            opacity: imageLoaded ? 0 : 1,
            visibility: imageLoaded ? "hidden" : "visible",
            pointerEvents: "none",
            transition: "opacity 0.35s ease-out, visibility 0.35s ease-out",
          }}
          aria-hidden="true"
        >
          <BlurhashCanvas blurhash={photo.blurhash} width={32} height={32} />
        </div>
      )}

      {/* Genuine Storage Error Fallback */}
      {hasError && (
        <div className={styles.cardErrorFallback} aria-hidden="true">
          <span className={styles.errorIcon}>📷</span>
          <span className={styles.errorText}>Photo Unavailable</span>
        </div>
      )}

      {/* Optimized Thumbnail Image */}
      {!hasError && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          ref={imgRef}
          src={photo.thumbUrl}
          alt="TechnoVIT Festival Photograph"
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          className={`${styles.cardImage} ${imageLoaded ? styles.cardImageVisible : ""}`}
          onLoad={markLoaded}
          onError={markError}
        />
      )}

      {/* Hover Information Overlay */}
      {!hasError && (
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
      )}
    </div>
  );
}

