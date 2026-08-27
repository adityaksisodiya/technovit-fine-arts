"use client";

import { useEffect, useCallback } from "react";
import type { PublicPhoto } from "@/types";
import { formatPhotoDateFull } from "@/lib/utils/date";
import styles from "./Gallery.module.css";

interface CinematicLightboxProps {
  photo: PublicPhoto | null;
  allPhotos: PublicPhoto[];
  onClose: () => void;
  onSelectPhoto: (photo: PublicPhoto) => void;
}

export function CinematicLightbox({
  photo,
  allPhotos,
  onClose,
  onSelectPhoto,
}: CinematicLightboxProps) {
  const currentIndex = photo ? allPhotos.findIndex((p) => p.id === photo.id) : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex !== -1 && currentIndex < allPhotos.length - 1;

  const handlePrev = useCallback(() => {
    if (hasPrev) {
      onSelectPhoto(allPhotos[currentIndex - 1]);
    }
  }, [hasPrev, currentIndex, allPhotos, onSelectPhoto]);

  const handleNext = useCallback(() => {
    if (hasNext) {
      onSelectPhoto(allPhotos[currentIndex + 1]);
    }
  }, [hasNext, currentIndex, allPhotos, onSelectPhoto]);

  useEffect(() => {
    if (!photo) return;

    // Lock body scroll
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") handlePrev();
      else if (e.key === "ArrowRight") handleNext();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [photo, onClose, handlePrev, handleNext]);

  if (!photo) return null;

  return (
    <div
      className={styles.lightboxBackdrop}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Expanded photo viewer"
    >
      {/* Top Bar */}
      <header className={styles.lightboxHeader} onClick={(e) => e.stopPropagation()}>
        <div className={styles.lightboxCounter}>
          Moment {currentIndex + 1} of {allPhotos.length}
        </div>

        <div className={styles.lightboxControls}>
          <a
            href={photo.displayUrl}
            download={`technovit-moment-${photo.id.slice(0, 8)}.webp`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.lightboxBtn}
            title="Download high-resolution photograph"
          >
            <span>↓ Download</span>
          </a>

          <button
            type="button"
            className={styles.lightboxBtn}
            onClick={onClose}
            aria-label="Close viewer (Escape)"
          >
            <span>✕ Close</span>
          </button>
        </div>
      </header>

      {/* Main Image Viewer Stage */}
      <div className={styles.lightboxStage} onClick={(e) => e.stopPropagation()}>
        {hasPrev && (
          <button
            type="button"
            className={`${styles.navArrow} ${styles.navArrowPrev}`}
            onClick={handlePrev}
            aria-label="Previous photograph (Left Arrow)"
          >
            ‹
          </button>
        )}

        <div className={styles.lightboxImageWrapper}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.displayUrl}
            alt="TechnoVIT Festival Expanded Photograph"
            className={styles.lightboxImg}
          />
        </div>

        {hasNext && (
          <button
            type="button"
            className={`${styles.navArrow} ${styles.navArrowNext}`}
            onClick={handleNext}
            aria-label="Next photograph (Right Arrow)"
          >
            ›
          </button>
        )}
      </div>

      {/* Footer Meta */}
      <footer className={styles.lightboxFooter} onClick={(e) => e.stopPropagation()}>
        <span>
          TechnoVIT Fine Arts Collection • Captured {formatPhotoDateFull(photo.created_at)}
        </span>
      </footer>
    </div>
  );
}
