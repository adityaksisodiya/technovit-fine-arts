import { PhotoUpload } from "@/components/PhotoUpload";
import styles from "./page.module.css";

/**
 * Public Homepage — Fine Arts Club × VIT Chennai
 *
 * Anonymous photo upload portal and upcoming public gallery.
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

        {/* Divider with artistic diamond flair */}
        <div className={styles.dividerWrap}>
          <div className={styles.dividerLine} />
          <span className={styles.dividerIcon} aria-hidden="true">
            ◆
          </span>
          <div className={styles.dividerLine} />
        </div>

        {/* Anonymous Photo Upload Component */}
        <PhotoUpload />

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
