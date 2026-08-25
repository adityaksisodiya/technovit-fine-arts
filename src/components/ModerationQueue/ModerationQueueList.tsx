"use client";

import React, { useState, useTransition, useCallback } from "react";
import type { Photo } from "@/types";
import { approvePhotoAction, rejectPhotoAction } from "@/app/admin/moderation/actions";
import { ModerationCard } from "./ModerationCard";
import { PhotoLightbox } from "./PhotoLightbox";
import styles from "./ModerationQueue.module.css";

interface ModerationQueueListProps {
  initialPhotos: Photo[];
}

export function ModerationQueueList({ initialPhotos }: ModerationQueueListProps) {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [inspectingPhoto, setInspectingPhoto] = useState<Photo | null>(null);
  const [rejectingPhoto, setRejectingPhoto] = useState<Photo | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [, startTransition] = useTransition();

  const handleApprove = useCallback(
    async (photoId: string) => {
      setFeedback(null);
      setProcessingIds((prev) => new Set(prev).add(photoId));

      startTransition(async () => {
        try {
          const result = await approvePhotoAction(photoId);

          if (result.success) {
            setPhotos((prev) => prev.filter((p) => p.id !== photoId));
            setFeedback({
              type: "success",
              message: "Photo approved and published to the gallery.",
            });
          } else {
            setFeedback({
              type: "error",
              message: result.error || "Failed to approve photo.",
            });
            // If already moderated, remove from pending view
            if (result.code === "ALREADY_MODERATED") {
              setPhotos((prev) => prev.filter((p) => p.id !== photoId));
            }
          }
        } catch (err) {
          console.error("Approval error:", err);
          setFeedback({
            type: "error",
            message: "An unexpected error occurred while approving the photo.",
          });
        } finally {
          setProcessingIds((prev) => {
            const next = new Set(prev);
            next.delete(photoId);
            return next;
          });
        }
      });
    },
    []
  );

  const handleRejectConfirm = async () => {
    if (!rejectingPhoto) return;
    const photoId = rejectingPhoto.id;
    const reason = rejectReason.trim() || undefined;

    setRejectingPhoto(null);
    setRejectReason("");
    setFeedback(null);
    setProcessingIds((prev) => new Set(prev).add(photoId));

    startTransition(async () => {
      try {
        const result = await rejectPhotoAction(photoId, reason);

        if (result.success) {
          setPhotos((prev) => prev.filter((p) => p.id !== photoId));
          setFeedback({
            type: "success",
            message: "Photo rejected. The submission will not be shown publicly.",
          });
        } else {
          setFeedback({
            type: "error",
            message: result.error || "Failed to reject photo.",
          });
          if (result.code === "ALREADY_MODERATED") {
            setPhotos((prev) => prev.filter((p) => p.id !== photoId));
          }
        }
      } catch (err) {
        console.error("Rejection error:", err);
        setFeedback({
          type: "error",
          message: "An unexpected error occurred while rejecting the photo.",
        });
      } finally {
        setProcessingIds((prev) => {
          const next = new Set(prev);
          next.delete(photoId);
          return next;
        });
      }
    });
  };

  return (
    <section className={styles.queueSection} aria-label="Pending photos moderation queue">
      {/* Action Notification Banner */}
      {feedback && (
        <div
          className={`${styles.banner} ${
            feedback.type === "success"
              ? styles.bannerSuccess
              : styles.bannerError
          }`}
          role="status"
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            className={styles.bannerDismiss}
            onClick={() => setFeedback(null)}
            aria-label="Dismiss message"
          >
            ×
          </button>
        </div>
      )}

      {/* Main Photos Grid or Empty State */}
      {photos.length > 0 ? (
        <div className={styles.grid}>
          {photos.map((photo) => (
            <ModerationCard
              key={photo.id}
              photo={photo}
              isProcessing={processingIds.has(photo.id)}
              onApprove={handleApprove}
              onRejectClick={(p) => {
                setRejectingPhoto(p);
                setRejectReason("");
              }}
              onInspect={(p) => setInspectingPhoto(p)}
            />
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon} aria-hidden="true">
            ✨
          </div>
          <h3 className={styles.emptyTitle}>All Caught Up!</h3>
          <p className={styles.emptyText}>
            There are no photos waiting in the moderation queue. New anonymous submissions will appear here automatically.
          </p>
        </div>
      )}

      {/* Lightbox Modal */}
      <PhotoLightbox
        photo={inspectingPhoto}
        onClose={() => setInspectingPhoto(null)}
      />

      {/* Rejection Reason Modal */}
      {rejectingPhoto && (
        <div
          className={styles.modalOverlay}
          onClick={() => setRejectingPhoto(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Reject photo confirmation"
        >
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={styles.modalTitle}>Reject Photo</h3>
            <p className={styles.emptyText}>
              Are you sure you want to reject this photo? The photo will not be
              shown in the public gallery.
            </p>

            <div>
              <label
                htmlFor="rejection-reason-input"
                className={styles.metaLabel}
                style={{ marginBottom: "6px", display: "block" }}
              >
                Optional Reason (Internal Audit Log)
              </label>
              <textarea
                id="rejection-reason-input"
                className={styles.modalInput}
                placeholder="e.g. Blurry image, inappropriate content, off-topic..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                autoFocus
              />
            </div>

            <div className={styles.modalActions}>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => setRejectingPhoto(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.btnReject}
                style={{ flex: "none", padding: "8px 16px" }}
                onClick={handleRejectConfirm}
                id="confirm-reject-btn"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
