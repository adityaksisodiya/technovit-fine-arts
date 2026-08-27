"use client";

import styles from "./LivingCanvas.module.css";

export function LivingCanvas() {
  return (
    <div className={styles.canvasRoot} aria-hidden="true">
      {/* Moving Technical Micro-Grid */}
      <div className={styles.techGrid} />

      {/* SVG Orthogonal Vector Paths (Arts × Tech Collision Layer) */}
      <svg className={styles.techVectorLayer} xmlns="http://www.w3.org/2000/svg">
        {/* Top-Right Circuit Trace */}
        <path d="M 50 120 L 180 120 L 220 160 L 400 160" strokeWidth="1" strokeDasharray="4 4" />
        <circle cx="50" cy="120" r="2.5" fill="rgba(23, 20, 18, 0.2)" />
        <circle cx="400" cy="160" r="2.5" fill="rgba(23, 20, 18, 0.2)" />

        {/* Mid-Left Coordinate Branch */}
        <path d="M 0 450 L 120 450 L 160 490 L 320 490" strokeWidth="1" />
        <circle cx="120" cy="450" r="2" fill="rgba(43, 89, 255, 0.3)" />

        {/* Bottom-Right Crosshair Alignment */}
        <path d="M 850 700 L 980 700 L 1020 740 L 1200 740" strokeWidth="1" strokeDasharray="6 3" />
        <circle cx="1020" cy="740" r="2.5" fill="rgba(226, 78, 43, 0.3)" />
      </svg>

      {/* Translucent Fine-Arts Watercolor Washes */}
      <div className={`${styles.paintBlob} ${styles.blobTerracotta}`} />
      <div className={`${styles.paintBlob} ${styles.blobCobalt}`} />
      <div className={`${styles.paintBlob} ${styles.blobGold}`} />
      <div className={`${styles.paintBlob} ${styles.blobViolet}`} />

      {/* Floating Technical Coordinate Marks */}
      <div className={`${styles.floatingMark} ${styles.mark1}`}>
        + 12.8406° N • 80.1534° E [FAC-01]
      </div>
      <div className={`${styles.floatingMark} ${styles.mark2}`}>
        {"// TECHNOVIT.FINE_ARTS.INSTALLATION //"}
      </div>
      <div className={`${styles.floatingMark} ${styles.mark3}`}>
        {"+ RAW.STREAM.4K // FRAME_SYNC"}
      </div>
    </div>
  );
}
