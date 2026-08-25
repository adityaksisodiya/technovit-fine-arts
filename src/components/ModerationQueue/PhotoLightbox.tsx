"use client";

import React, { useEffect, useCallback } from "react";
import Image from "next/image";
import type { Photo } from "@/types";
import styles from "./ModerationQueue.module.css";

interface PhotoLightboxProps {
  photo: Photo | null;
  onClose: () => void;
}

export function PhotoLightbox({ photo, onClose }: PhotoLightboxProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (photo) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [photo, handleKeyDown]);

  if (!photo) return null;

  const displayUrl = `/api/admin/photos/${photo.id}/preview?variant=display`;

  return (
    <div
      className={styles.lightboxOverlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Full-size photo inspection"
    >
      <div
        className={styles.lightboxContent}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className={styles.lightboxClose}
          onClick={onClose}
          aria-label="Close full-size photo"
        >
          ×
        </button>

        <Image
          src={displayUrl}
          alt={`Photo inspection ${photo.id}`}
          className={styles.lightboxImg}
          width={photo.width || 1200}
          height={photo.height || 900}
          unoptimized
        />

        <div className={styles.lightboxDetails}>
          <span>
            {photo.width} × {photo.height} px
          </span>
          <span>•</span>
          <span>
            {photo.file_size_bytes
              ? `${(photo.file_size_bytes / 1024).toFixed(1)} KB`
              : "Unknown size"}
          </span>
          {photo.uploaded_from_ip && (
            <>
              <span>•</span>
              <span className={styles.ipBadge}>IP: {photo.uploaded_from_ip}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
