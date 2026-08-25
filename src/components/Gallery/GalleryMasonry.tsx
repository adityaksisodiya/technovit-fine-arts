"use client";

import { useState, useCallback } from "react";
import type { PublicPhoto, PublicGalleryResult } from "@/lib/gallery";
import { GalleryCard } from "./GalleryCard";
import { PublicPhotoLightbox } from "./PublicPhotoLightbox";
import styles from "./Gallery.module.css";

interface GalleryMasonryProps {
  initialPhotos: PublicPhoto[];
  initialNextCursor: string | null;
  totalApprovedCount: number;
}

/**
 * Interactive masonry gallery with client-side cursor pagination,
 * infinite scroll, responsive breakpoints, and full-screen lightbox.
 */
export function GalleryMasonry({
  initialPhotos,
  initialNextCursor,
  totalApprovedCount,
}: GalleryMasonryProps) {
  const [photos, setPhotos] = useState<PublicPhoto[]>(initialPhotos);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [hasMore, setHasMore] = useState<boolean>(initialNextCursor !== null);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [selectedPhoto, setSelectedPhoto] = useState<PublicPhoto | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Load more photos via cursor API
  const handleLoadMore = useCallback(async () => {
    if (!nextCursor || isLoadingMore) return;

    setIsLoadingMore(true);
    setLoadError(null);

    try {
      const res = await fetch(`/api/photos?cursor=${encodeURIComponent(nextCursor)}&limit=18`);
      if (!res.ok) {
        throw new Error(`Failed to load more photos (HTTP ${res.status})`);
      }

      const data: PublicGalleryResult = await res.json();

      setPhotos((prev) => {
        // Prevent accidental duplicates
        const existingIds = new Set(prev.map((p) => p.id));
        const newUnique = data.photos.filter((p) => !existingIds.has(p.id));
        return [...prev, ...newUnique];
      });

      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (err) {
      console.error("Failed to load more photos:", err);
      setLoadError("Unable to load additional photos. Please try again.");
    } finally {
      setIsLoadingMore(false);
    }
  }, [nextCursor, isLoadingMore]);

  return (
    <section className={styles.gallerySection} aria-label="Photo Gallery">
      {/* Header bar */}
      <div className={styles.galleryHeader}>
        <div className={styles.galleryTitleGroup}>
          <h2 className={styles.gallerySectionTitle}>Festival Moments</h2>
          <span className={styles.galleryCountBadge}>
            {totalApprovedCount} {totalApprovedCount === 1 ? "Photograph" : "Photographs"}
          </span>
        </div>
      </div>

      {/* Empty State */}
      {photos.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon} aria-hidden="true">
            🎨
          </span>
          <h3 className={styles.emptyTitle}>The canvas is fresh</h3>
          <p className={styles.emptyDesc}>
            Be the first to share a festival memory! Upload your photo above to have it featured in the official gallery.
          </p>
        </div>
      ) : (
        <>
          {/* Responsive CSS Columns Masonry Grid */}
          <div className={styles.masonryGrid}>
            {photos.map((photo, index) => (
              <GalleryCard
                key={photo.id}
                photo={photo}
                onSelect={setSelectedPhoto}
                priority={index < 6}
              />
            ))}
          </div>

          {/* Pagination / Load More Controls */}
          <div className={styles.loadMoreContainer}>
            {loadError && (
              <p className="form-error" role="alert">
                {loadError}
              </p>
            )}

            {hasMore ? (
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className={`btn btn--secondary ${styles.loadMoreBtn}`}
                id="load-more-photos-btn"
              >
                {isLoadingMore ? (
                  <>
                    <span className={styles.loadingSpinner} aria-hidden="true" />
                    <span>Loading...</span>
                  </>
                ) : (
                  "Load More Photos ↓"
                )}
              </button>
            ) : (
              <p className={styles.endOfGalleryText}>
                You&apos;ve viewed all {photos.length} festival moments.
              </p>
            )}
          </div>
        </>
      )}

      {/* Full-Screen Lightbox */}
      <PublicPhotoLightbox
        photo={selectedPhoto}
        photos={photos}
        onClose={() => setSelectedPhoto(null)}
        onSelectPhoto={setSelectedPhoto}
      />
    </section>
  );
}
