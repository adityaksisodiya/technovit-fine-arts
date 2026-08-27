"use client";

import { useState, useRef, useEffect } from "react";
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
 * Computes a subtle, deterministic rotation angle between -3.5° and +3.5°
 * based on the photo ID string so the artistic wall feels organic.
 */
function getDeterministicRotation(id: string, index: number): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const angles = [-3, 2.5, -1.8, 3.2, 0, -2.2, 1.5, -3.5, 2.8, -0.8];
  const absIndex = Math.abs(hash + index) % angles.length;
  return angles[absIndex];
}

export function PhotoCard({ photo, index, onOpenLightbox }: PhotoCardProps) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Collage roles for rhythm
  const isFeatured = index % 7 === 0;
  const isHeroAnchor = index % 5 === 0;
  const rotation = isFeatured ? 0 : getDeterministicRotation(photo.id, index);
  const aspectRatio = photo.width && photo.height ? photo.width / photo.height : 4 / 3;
  const staggerDelay = Math.min((index % 12) * 0.04, 0.4);

  // Four varied floating movement variants for continuous organic life
  const floatClasses = [styles.floatA, styles.floatB, styles.floatC, styles.floatD];
  const floatClass = floatClasses[index % 4];

  // Check if image was already cached in browser memory upon component mounting
  useEffect(() => {
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setLoaded(true);
    }
  }, []);

  return (
    <div
      className={`${styles.photoCardWrapper} ${isHeroAnchor ? styles.wrapperHeroAnchor : ""}`}
      style={{
        transform: `rotate(${rotation}deg)`,
        animationDelay: `${staggerDelay}s`,
      }}
    >
      <article
        className={`${styles.photoCard} ${floatClass} ${isFeatured ? styles.cardFeatured : ""}`}
        onClick={() => onOpenLightbox(photo)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpenLightbox(photo);
          }
        }}
        tabIndex={0}
        role="button"
        aria-label={`View photo from TechnoVIT festival, captured ${formatPhotoDate(photo.created_at)}`}
      >
        {/* Physical art installation corner pin */}
        <div className={styles.pinDot} aria-hidden="true" />

        {/* Visual Frame */}
        <div
          className={styles.mediaFrame}
          style={{ aspectRatio: `${aspectRatio}` }}
        >
          {/* BlurHash Placeholder — Smoothly fades out as soon as real photo is loaded */}
          {photo.blurhash && (
            <div
              className={styles.blurhashWrap}
              style={{
                opacity: loaded ? 0 : 1,
                visibility: loaded ? "hidden" : "visible",
                transition: "opacity 0.4s ease-out, visibility 0.4s ease-out",
              }}
              aria-hidden="true"
            >
              <BlurhashCanvas
                blurhash={photo.blurhash}
                className={styles.canvasBlurhash}
              />
            </div>
          )}

          {/* Real Photo */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={photo.thumbUrl}
            alt="TechnoVIT Festival Moment"
            className={styles.imageElement}
            loading={index < 6 ? "eager" : "lazy"}
            onLoad={() => setLoaded(true)}
            style={{
              opacity: loaded ? 1 : 0,
            }}
          />
        </div>

        {/* Caption & Micro-Meta */}
        <div className={styles.cardMeta}>
          <span>{formatPhotoDate(photo.created_at)}</span>
          <span className={styles.expandHint}>Expand ↗</span>
        </div>
      </article>
    </div>
  );
}
