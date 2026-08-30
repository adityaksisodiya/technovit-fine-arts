"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { PublicPhoto } from "@/types";
import { formatPhotoDate } from "@/lib/utils/date";
import { BlurhashCanvas } from "./BlurhashCanvas";
import styles from "./Gallery.module.css";

interface PhotoCardProps {
  photo: PublicPhoto;
  index: number;
  onOpenLightbox: (photo: PublicPhoto) => void;
}

/**
 * Computes a subtle, deterministic rotation angle between -3° and +3°
 * based on the photo ID string so the artistic wall feels organic.
 */
function getDeterministicRotation(id: string, index: number): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const angles = [-2.5, 2, -1.5, 2.8, 0, -1.8, 1.2, -3, 2.2, -0.6];
  const absIndex = Math.abs(hash + index) % angles.length;
  return angles[absIndex];
}

export function PhotoCard({ photo, index, onOpenLightbox }: PhotoCardProps) {
  const [loaded, setLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const markLoaded = useCallback(() => {
    setLoaded(true);
    setHasError(false);
  }, []);

  const markError = useCallback(() => {
    setHasError(true);
    setLoaded(false);
  }, []);

  const isHeroAnchor = index % 5 === 0;
  const rotation = getDeterministicRotation(photo.id, index);
  const aspectRatio = photo.width && photo.height ? photo.width / photo.height : 4 / 3;
  const staggerDelay = Math.min((index % 12) * 0.04, 0.4);

  // Varied floating movement variants for continuous organic life
  const floatClasses = [styles.floatA, styles.floatB, styles.floatC, styles.floatD];
  const floatClass = floatClasses[index % 4];

  // Comprehensive image readiness lifecycle: Handles cached images, SSR hydration, and fast decode
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    // 1. Direct memory/browser cache check
    if (img.complete && img.naturalWidth > 0) {
      setLoaded(true);
      setHasError(false);
      return;
    }

    // 2. Decode confirmation if supported by browser
    if (typeof img.decode === "function") {
      img
        .decode()
        .then(() => {
          setLoaded(true);
          setHasError(false);
        })
        .catch(() => {
          if (img.complete && img.naturalWidth > 0) {
            setLoaded(true);
            setHasError(false);
          }
        });
    }
  }, [photo.thumbUrl]);

  return (
    <div
      className={`${styles.photoCardWrapper} ${isHeroAnchor ? styles.wrapperHeroAnchor : ""}`}
      style={{
        transform: `rotate(${rotation}deg)`,
        animationDelay: `${staggerDelay}s`,
      }}
    >
      <article
        className={`${styles.photoCard} ${floatClass}`}
        onClick={() => !hasError && onOpenLightbox(photo)}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !hasError) {
            e.preventDefault();
            onOpenLightbox(photo);
          }
        }}
        tabIndex={hasError ? -1 : 0}
        role={hasError ? undefined : "button"}
        aria-label={`View photo from TechnoVIT festival, captured ${formatPhotoDate(photo.created_at)}`}
      >
        {/* Physical art installation corner pin */}
        <div className={styles.pinDot} aria-hidden="true" />

        {/* Visual Frame */}
        <div
          className={styles.mediaFrame}
          style={{ aspectRatio: `${aspectRatio}` }}
        >
          {/* BlurHash Placeholder — Smoothly fades out and hides once real photo is ready */}
          {photo.blurhash && !hasError && (
            <div
              className={styles.blurhashWrap}
              style={{
                opacity: loaded ? 0 : 1,
                visibility: loaded ? "hidden" : "visible",
                pointerEvents: "none",
                transition: "opacity 0.35s ease-out, visibility 0.35s ease-out",
              }}
              aria-hidden="true"
            >
              <BlurhashCanvas
                blurhash={photo.blurhash}
                className={styles.canvasBlurhash}
              />
            </div>
          )}

          {/* Genuine Storage Error Fallback */}
          {hasError && (
            <div className={styles.cardErrorFallback} aria-hidden="true">
              <span className={styles.errorIcon}>📷</span>
              <span className={styles.errorText}>Photo Unavailable</span>
            </div>
          )}

          {/* Real Photograph */}
          {!hasError && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              ref={imgRef}
              src={photo.thumbUrl}
              alt="TechnoVIT Festival Moment"
              className={styles.imageElement}
              loading={index < 6 ? "eager" : "lazy"}
              decoding="async"
              onLoad={markLoaded}
              onError={markError}
              style={{
                opacity: loaded ? 1 : 0,
                transition: "opacity 0.35s ease-out, transform var(--duration-slow) var(--ease-out)",
              }}
            />
          )}
        </div>

        {/* Caption & Micro-Meta */}
        <div className={styles.cardMeta}>
          <span>{formatPhotoDate(photo.created_at)}</span>
          {!hasError && <span className={styles.expandHint}>Expand ↗</span>}
        </div>
      </article>
    </div>
  );
}


