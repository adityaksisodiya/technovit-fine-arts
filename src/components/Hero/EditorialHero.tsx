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
          style={{ background: "linear-gradient(135deg, rgba(212, 175, 55, 0.15), rgba(233, 215, 161, 0.15))" }}
        >
          <div className={styles.heroThumbPin} />
          🎨
        </div>
        <span className={styles.heroThumbCaption}>#FineArtsClub</span>
      </div>

      {/* Prominent Event Identifier Eyebrow */}
      <div className={styles.eventEyebrow}>
        <span className={styles.eyebrowSparkle} aria-hidden="true">✦</span>
        <span className={styles.eyebrowText}>TechnoVIT 2026</span>
        <span className={styles.eyebrowSparkle} aria-hidden="true">✦</span>
      </div>

      {/* Primary Editorial Headline with Subordinate Attribution */}
      <h1 className={styles.headline}>
        <span className={styles.mainTitle}>A Canvas of TechnoVIT</span>
        <span className={styles.attributionLine}>
          <span className={styles.attributionDash} aria-hidden="true">—</span>{" "}
          <span className={styles.attributionText}>By Fine Arts Club</span>
        </span>
      </h1>

      {/* Subtitle */}
      <p className={styles.subtitle}>
        Share your TechnoVIT story. Don’t forget to tag Fine Arts Club!
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
