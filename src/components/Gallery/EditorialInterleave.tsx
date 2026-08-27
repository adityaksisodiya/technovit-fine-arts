"use client";

import styles from "./Gallery.module.css";

interface EditorialInterleaveProps {
  quote: string;
  actionText?: string;
  actionHref?: string;
}

export function EditorialInterleave({
  quote,
  actionText = "Drop your memory",
  actionHref = "#upload",
}: EditorialInterleaveProps) {
  return (
    <div className={styles.interleaveCard}>
      <p className={styles.interleaveQuote}>{quote}</p>
      <a href={actionHref} className={styles.interleaveAction}>
        <span>+ {actionText}</span>
        <span aria-hidden="true">→</span>
      </a>
    </div>
  );
}
