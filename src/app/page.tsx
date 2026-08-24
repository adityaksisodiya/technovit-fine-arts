import styles from "./page.module.css";

/**
 * Homepage — Phase 1 Placeholder
 *
 * In Phase 4, this will become the photo gallery with masonry layout.
 * For now, it identifies the project and validates the design system.
 */
export default function Home() {
  return (
    <main className={styles.main}>
      <div className={styles.container}>
        {/* Editorial header block */}
        <header className={styles.header}>
          <span className={styles.overline}>Fine Arts Club × VIT Chennai</span>
          <h1 className={styles.title}>
            Techno<span className={styles.titleAccent}>VIT</span>
          </h1>
          <p className={styles.subtitle}>Photo Gallery</p>
        </header>

        {/* Divider with artistic flair */}
        <div className={styles.dividerWrap}>
          <div className={styles.dividerLine} />
          <span className={styles.dividerIcon} aria-hidden="true">
            ◆
          </span>
          <div className={styles.dividerLine} />
        </div>

        {/* Status message */}
        <section className={styles.status}>
          <p className={styles.statusText}>
            The gallery is being prepared.
          </p>
          <p className={styles.statusDetail}>
            Phase 1 — Foundation established. Design system active.
          </p>
        </section>

        {/* Design token preview grid */}
        <section className={styles.preview} aria-label="Design system preview">
          <div className={styles.previewCard}>
            <div className={styles.colorRow}>
              <div
                className={styles.colorSwatch}
                style={{ backgroundColor: "var(--color-accent-primary)" }}
                title="Terracotta"
              />
              <div
                className={styles.colorSwatch}
                style={{ backgroundColor: "var(--color-accent-secondary)" }}
                title="Deep Navy"
              />
              <div
                className={styles.colorSwatch}
                style={{ backgroundColor: "var(--color-bg-tertiary)" }}
                title="Warm Stone"
              />
              <div
                className={styles.colorSwatch}
                style={{ backgroundColor: "var(--color-text-primary)" }}
                title="Ink"
              />
            </div>
            <p className={styles.previewLabel}>Palette</p>
          </div>

          <div className={styles.previewCard}>
            <p className={styles.previewSerif}>Playfair Display</p>
            <p className={styles.previewSans}>Inter Sans-Serif</p>
            <p className={styles.previewLabel}>Typography</p>
          </div>

          <div className={styles.previewCard}>
            <div className={styles.breakpointList}>
              <span className={styles.breakpointTag}>360</span>
              <span className={styles.breakpointTag}>390</span>
              <span className={styles.breakpointTag}>412</span>
              <span className={styles.breakpointTag}>768</span>
              <span className={styles.breakpointTag}>1440</span>
            </div>
            <p className={styles.previewLabel}>Breakpoints</p>
          </div>
        </section>

        {/* Footer */}
        <footer className={styles.footer}>
          <p className={styles.footerText}>
            © {new Date().getFullYear()} Fine Arts Club, VIT Chennai
          </p>
        </footer>
      </div>
    </main>
  );
}
