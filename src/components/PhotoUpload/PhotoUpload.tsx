"use client";

import React, { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { compressImageForUpload } from "@/lib/client/image-compress";
import type { UploadResponse, UploadErrorResponse } from "@/types";
import styles from "./PhotoUpload.module.css";

type UploadStage = "idle" | "compressing" | "uploading" | "success" | "error";

interface PhotoUploadProps {
  boothId?: string;
  onUploadSuccess?: (photoId: string) => void;
}

export function PhotoUpload({ boothId, onUploadSuccess }: PhotoUploadProps) {
  const [stage, setStage] = useState<UploadStage>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleReset = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setErrorMessage(null);
    setStage("idle");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const processAndUploadFile = useCallback(
    async (rawFile: File) => {
      setErrorMessage(null);

      // 1. Initial client-side validations
      if (!rawFile) return;

      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
      if (rawFile.type && !allowedTypes.includes(rawFile.type.toLowerCase())) {
        setErrorMessage("Please select a valid photo (JPEG, PNG, or WebP).");
        setStage("error");
        return;
      }

      if (rawFile.size > 10 * 1024 * 1024) {
        setErrorMessage(
          `The selected file (${(rawFile.size / (1024 * 1024)).toFixed(1)} MB) exceeds the 10 MB limit.`
        );
        setStage("error");
        return;
      }

      try {
        // 2. Client-side pre-compression
        setStage("compressing");
        const compressed = await compressImageForUpload(rawFile);

        // Create local preview URL for instant visual feedback
        const localUrl = URL.createObjectURL(compressed.file);
        setPreviewUrl(localUrl);

        // 3. Network transmission to /api/upload
        setStage("uploading");
        const formData = new FormData();
        formData.append("file", compressed.file);
        if (boothId) {
          formData.append("booth_id", boothId);
        }

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          let errorData: UploadErrorResponse | null = null;
          try {
            errorData = (await response.json()) as UploadErrorResponse;
          } catch {
            // Response body was not JSON
          }

          if (response.status === 429) {
            throw new Error(
              errorData?.error ||
                "Upload limit reached (10 uploads per 15 min). Please wait a few minutes before submitting another photo."
            );
          }

          if (response.status === 503) {
            throw new Error(
              errorData?.error ||
                "Gallery upload capacity is temporarily paused. Please check back shortly."
            );
          }

          throw new Error(
            errorData?.error || `Upload failed with status ${response.status}.`
          );
        }

        const result = (await response.json()) as UploadResponse;
        setStage("success");
        onUploadSuccess?.(result.id);
      } catch (err: unknown) {
        console.error("Upload error:", err);
        const msg =
          err instanceof Error
            ? err.message
            : "An unexpected error occurred during upload. Please try again.";
        setErrorMessage(msg);
        setStage("error");
      }
    },
    [boothId, onUploadSuccess]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processAndUploadFile(file);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      const file = e.dataTransfer.files?.[0];
      if (file) {
        processAndUploadFile(file);
      }
    },
    [processAndUploadFile]
  );

  const triggerPicker = () => {
    if (stage === "idle" || stage === "error") {
      fileInputRef.current?.click();
    }
  };

  const isBusy = stage === "compressing" || stage === "uploading";

  return (
    <section
      className={styles.uploadCard}
      aria-label="Photo upload section"
      id="photo-upload-section"
    >
      <header className={styles.uploadCardHeader}>
        <h3 className={styles.uploadTitle}>Select or Drop Photograph</h3>
        <p className={styles.uploadSubtitle}>
          Supports JPEG, PNG, or WebP up to 10 MB
        </p>
      </header>

      {/* Screen Reader Live Region */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {stage === "compressing" && "Optimizing photo for mobile transmission..."}
        {stage === "uploading" && "Uploading photo to gallery servers..."}
        {stage === "success" &&
          "Photo successfully submitted. Awaiting moderator review."}
        {stage === "error" && errorMessage}
      </div>

      {/* Main Upload / Processing Views */}
      {stage === "idle" && (
        <div
          className={`${styles.dropzone} ${dragActive ? styles.dragActive : ""}`}
          onClick={triggerPicker}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              triggerPicker();
            }
          }}
          aria-label="Click or drag and drop to upload a photo"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className={styles.fileInputHidden}
            id="photo-file-input"
            tabIndex={-1}
          />
          <div className={styles.iconWrapper} aria-hidden="true">
            <svg
              className={styles.iconSvg}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.75}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <p className={styles.promptText}>
            <span className={styles.promptHighlight}>Tap to select</span> or
            drag photo here
          </p>
          <p className={styles.hintText}>
            JPEG, PNG, or WebP • Up to 10 MB
          </p>
        </div>
      )}

      {isBusy && (
        <div className={styles.processingContainer}>
          <div className={styles.spinner} aria-hidden="true" />
          <p className={styles.processingStatus}>
            {stage === "compressing"
              ? "Preparing Photo..."
              : "Uploading to Gallery..."}
          </p>
          <p className={styles.processingDetail}>
            {stage === "compressing"
              ? "Compressing in browser for fast mobile upload"
              : "Sending encrypted payload to server"}
          </p>
        </div>
      )}

      {stage === "success" && (
        <div className={styles.successContainer}>
          <div className={styles.successBadge}>
            <svg
              className={styles.successIcon}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span>Pending Review</span>
          </div>

          {previewUrl && (
            <div className={styles.previewImageWrapper}>
              <Image
                src={previewUrl}
                alt="Submitted photo preview"
                className={styles.previewImg}
                width={140}
                height={140}
                unoptimized
              />
            </div>
          )}

          <h3 className={styles.successHeading}>Photo Received!</h3>
          <p className={styles.successMessage}>
            Thank you for contributing to TechnoVIT. Your photo has been
            submitted and will appear in the public gallery once approved by a
            moderator.
          </p>

          <button
            type="button"
            className="btn btn--primary"
            onClick={handleReset}
            id="upload-another-btn"
          >
            Upload Another Photo
          </button>
        </div>
      )}

      {stage === "error" && (
        <div className={styles.errorContainer}>
          <div
            className={`${styles.dropzone} ${styles.disabled}`}
            aria-hidden="true"
          >
            <div className={styles.iconWrapper}>
              <svg
                className={styles.iconSvg}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.75}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <p className={styles.promptText}>Upload Interrupted</p>
          </div>

          {errorMessage && (
            <div className={styles.errorBanner} role="alert">
              <svg
                className={styles.errorIcon}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className={styles.errorText}>{errorMessage}</p>
            </div>
          )}

          <button
            type="button"
            className={`btn btn--primary ${styles.retryBtn}`}
            onClick={handleReset}
            id="retry-upload-btn"
          >
            Try Again
          </button>
        </div>
      )}
    </section>
  );
}
