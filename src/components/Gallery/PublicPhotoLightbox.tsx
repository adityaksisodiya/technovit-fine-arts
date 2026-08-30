"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import type { PublicPhoto } from "@/lib/gallery";
import { BlurhashCanvas } from "./BlurhashCanvas";
import styles from "./Gallery.module.css";

interface PublicPhotoLightboxProps {
  photo: PublicPhoto | null;
  photos: PublicPhoto[];
  onClose: () => void;
  onSelectPhoto: (photo: PublicPhoto) => void;
}

/**
 * Full-screen lightbox modal for viewing high-resolution gallery photographs.
 * Supports keyboard navigation (Escape, ArrowLeft, ArrowRight), image download, and Blurhash transitions.
 */
export function PublicPhotoLightbox({
  photo,
  photos,
  onClose,
  onSelectPhoto,
}: PublicPhotoLightboxProps) {
  const [loadedPhotoId, setLoadedPhotoId] = useState<string | null>(null);
  const imageLoaded = photo ? loadedPhotoId === photo.id : false;
  const imgRef = useRef<HTMLImageElement | null>(null);

  const currentIndex = photo
    ? photos.findIndex((p) => p.id === photo.id)
    : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex !== -1 && currentIndex < photos.length - 1;

  const handlePrev = useCallback(() => {
    if (hasPrev) {
      onSelectPhoto(photos[currentIndex - 1]);
    }
  }, [hasPrev, photos, currentIndex, onSelectPhoto]);

  const handleNext = useCallback(() => {
    if (hasNext) {
      onSelectPhoto(photos[currentIndex + 1]);
    }
  }, [hasNext, photos, currentIndex, onSelectPhoto]);

  useEffect(() => {
    if (!photo) return;
    const img = imgRef.current;
    if (!img) return;

    if (img.complete && img.naturalWidth > 0) {
      setLoadedPhotoId(photo.id);
      return;
    }

    if (typeof img.decode === "function") {
      img
        .decode()
        .then(() => setLoadedPhotoId(photo.id))
        .catch(() => {
          if (img.complete && img.naturalWidth > 0) {
            setLoadedPhotoId(photo.id);
          }
        });
    }
  }, [photo]);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!photo) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [photo, onClose, handlePrev, handleNext]);

  if (!photo) return null;

  const formattedDate = new Date(photo.created_at).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={styles.lightboxBackdrop}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Photo Lightbox"
    >
      {/* Lightbox Content Container */}
      <div
        className={styles.lightboxContent}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Action Bar */}
        <div className={styles.lightboxTopBar}>
          <div className={styles.lightboxMeta}>
            <span className={styles.lightboxIndex}>
              {currentIndex + 1} of {photos.length}
            </span>
            <span className={styles.lightboxDate}>{formattedDate}</span>
          </div>

          <div className={styles.lightboxActions}>
            <a
              href={photo.displayUrl}
              download={`technovit-photo-${photo.id}.webp`}
              className={`btn btn--ghost ${styles.lightboxBtn}`}
              title="Download high-resolution photograph"
              target="_blank"
              rel="noreferrer"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              <span>Download</span>
            </a>

            <button
              type="button"
              onClick={onClose}
              className={`btn btn--ghost ${styles.lightboxCloseBtn}`}
              aria-label="Close Lightbox (Escape)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* High-Resolution Image Container with Blurhash placeholder */}
        <div className={styles.lightboxImageWrapper}>
          {photo.blurhash && (
            <div
              className={styles.lightboxBlurhash}
              style={{
                opacity: imageLoaded ? 0 : 1,
                visibility: imageLoaded ? "hidden" : "visible",
                pointerEvents: "none",
                transition: "opacity 0.35s ease-out, visibility 0.35s ease-out",
              }}
              aria-hidden="true"
            >
              <BlurhashCanvas blurhash={photo.blurhash} width={64} height={64} />
            </div>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={photo.displayUrl}
            alt="TechnoVIT Festival Photograph"
            className={`${styles.lightboxImage} ${imageLoaded ? styles.lightboxImageVisible : ""}`}
            onLoad={() => setLoadedPhotoId(photo.id)}
            onError={() => setLoadedPhotoId(photo.id)}
          />


          {/* Previous Button */}
          {hasPrev && (
            <button
              type="button"
              onClick={handlePrev}
              className={`${styles.lightboxNavBtn} ${styles.lightboxNavPrev}`}
              aria-label="Previous photo (Left Arrow)"
            >
              ‹
            </button>
          )}

          {/* Next Button */}
          {hasNext && (
            <button
              type="button"
              onClick={handleNext}
              className={`${styles.lightboxNavBtn} ${styles.lightboxNavNext}`}
              aria-label="Next photo (Right Arrow)"
            >
              ›
            </button>
          )}
        </div>

        {/* Footer Details */}
        <div className={styles.lightboxFooter}>
          {photo.width && photo.height && (
            <span className={styles.lightboxDimensions}>
              {photo.width} × {photo.height} px
            </span>
          )}
          <span className={styles.lightboxFineArtsBadge}>
            Fine Arts Club × VIT Chennai
          </span>
        </div>
      </div>
    </div>
  );
}
