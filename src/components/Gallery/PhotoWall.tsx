"use client";

import { useState } from "react";
import type { PublicPhoto } from "@/types";
import { PhotoCard } from "./PhotoCard";
import { EditorialInterleave } from "./EditorialInterleave";
import { CinematicLightbox } from "./CinematicLightbox";
import styles from "./Gallery.module.css";

interface PhotoWallProps {
  initialPhotos: PublicPhoto[];
  initialCursor: string | null;
  initialHasMore: boolean;
  totalApprovedCount: number;
}

const EDITORIAL_QUOTES = [
  "“Someone captured this light. Your turn to share yours.”",
  "“This wall is built by thousands of student perspectives.”",
  "“Seen at TechnoVIT. Every frame tells a story.”",
  "“Art is what happens when thousands of students celebrate together.”",
];

export function PhotoWall({
  initialPhotos,
  initialCursor,
  initialHasMore,
  totalApprovedCount,
}: PhotoWallProps) {
  const [photos, setPhotos] = useState<PublicPhoto[]>(initialPhotos);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [hasMore, setHasMore] = useState<boolean>(initialHasMore);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [activePhoto, setActivePhoto] = useState<PublicPhoto | null>(null);

  const handleLoadMore = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);

    try {
      const res = await fetch(`/api/photos?cursor=${encodeURIComponent(cursor)}&limit=18`);
      if (!res.ok) throw new Error("Failed to load more photos");

      const data = await res.json();
      setPhotos((prev) => [...prev, ...(data.photos || [])]);
      setCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (err) {
      console.error("Error loading more gallery photos:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <section id="wall" className={styles.wallSection} aria-label="TechnoVIT Living Photo Wall">
      {/* Wall Header */}
      <div className={styles.wallHeader}>
        <h2 className={styles.wallTitle}>
          <span>The Memory Wall</span>
        </h2>
        <span className={styles.wallCounter}>
          Showing {photos.length} of {totalApprovedCount} Photographs
        </span>
      </div>

      {photos.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon} aria-hidden="true">
            🎨
          </div>
          <h3 className={styles.emptyTitle}>The Wall is Waiting for Its First Moment</h3>
          <p className={styles.emptyText}>
            Be the first to leave your mark on the TechnoVIT Living Photo Wall. Drop your photograph below!
          </p>
          <a href="#upload" className="btn btn--primary">
            + Drop the First Photograph
          </a>
        </div>
      ) : (
        <>
          {/* Scattered Photographic Masonry */}
          <div className={styles.photoWallGrid}>
            {photos.map((photo, index) => {
              const shouldInsertQuote = (index + 1) % 6 === 0;
              const quoteIndex = Math.floor(index / 6) % EDITORIAL_QUOTES.length;

              return (
                <div key={photo.id} style={{ display: "contents" }}>
                  <PhotoCard
                    photo={photo}
                    index={index}
                    onOpenLightbox={(p) => setActivePhoto(p)}
                  />

                  {shouldInsertQuote && (
                    <EditorialInterleave
                      quote={EDITORIAL_QUOTES[quoteIndex]}
                      actionText="Share your moment"
                      actionHref="#upload"
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className={styles.loadMoreArea}>
              <button
                type="button"
                className={styles.loadMoreBtn}
                disabled={loadingMore}
                onClick={handleLoadMore}
              >
                {loadingMore ? (
                  <span>Loading More Moments...</span>
                ) : (
                  <span>Explore More Memories ({totalApprovedCount - photos.length} Remaining) ↓</span>
                )}
              </button>
            </div>
          )}
        </>
      )}

      {/* Cinematic Fullscreen Lightbox */}
      <CinematicLightbox
        photo={activePhoto}
        allPhotos={photos}
        onClose={() => setActivePhoto(null)}
        onSelectPhoto={(p) => setActivePhoto(p)}
      />
    </section>
  );
}
