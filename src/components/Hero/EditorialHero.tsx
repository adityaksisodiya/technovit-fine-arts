"use client";

import Link from "next/link";
import styles from "./EditorialHero.module.css";

export function EditorialHero() {
  return (
    <section className={styles.hero} aria-label="TechnoVIT Memory Wall Introduction">
      {/* Decorative Ambient Teaser Cards */}
      <div className={styles.heroFloatingCardLeft} aria-hidden="true">
        <div className={styles.heroThumbPlaceholder}>
          <div className={styles.heroThumbPin} />
          📸
        </div>
        <span className={styles.heroThumbCaption}>#TechnoVIT Moments</span>
      </div>

      <div className={styles.heroFloatingCardRight} aria-hidden="true">
        <div
          className={styles.heroThumbPlaceholder}
          style={{ background: "linear-gradient(135deg, rgba(226, 78, 43, 0.15), rgba(245, 158, 11, 0.15))" }}
        >
          <div className={styles.heroThumbPin} />
          🎨
        </div>
        <span className={styles.heroThumbCaption}>#FineArtsClub</span>
      </div>

      {/* Primary Editorial Headline */}
      <h1 className={styles.headline}>
        See it. Live it. <br />
        <span className={styles.accentWord}>Share the moment.</span>
      </h1>

      {/* Subtitle */}
      <p className={styles.subtitle}>
        Thousands of moments. One living festival wall.
      </p>

      {/* Action CTAs */}
      <div className={styles.actionRow}>
        <a href="#upload" className={styles.dropBtn}>
          <span>+ Drop Your Moment</span>
        </a>

        <Link href="/map" className={styles.mapBtn}>
          <span>Explore Campus Map ↗</span>
        </Link>
      </div>
    </section>
  );
}
