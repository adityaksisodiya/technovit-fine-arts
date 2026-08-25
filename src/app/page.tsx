import type { Metadata } from "next";
import { PhotoUpload } from "@/components/PhotoUpload";
import { GalleryMasonry } from "@/components/Gallery";
import { getPublicGalleryPhotos } from "@/lib/gallery";
import styles from "./page.module.css";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "TechnoVIT Photo Gallery — Fine Arts Club × VIT Chennai",
  description:
    "Official live photo gallery and anonymous submission portal for TechnoVIT by Fine Arts Club, VIT Chennai.",
  openGraph: {
    title: "TechnoVIT Photo Gallery",
    description: "Live festival photography captured at TechnoVIT, VIT Chennai.",
    type: "website",
  },
};

/**
 * Public Homepage — Fine Arts Club × VIT Chennai
 *
 * Combines anonymous photo submission portal with a responsive,
 * server-rendered live gallery for approved festival photos.
 */
export default async function Home() {
  // Fetch initial batch of approved photos server-side for fast FCP & SEO
  const galleryData = await getPublicGalleryPhotos({ limit: 18 });

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        {/* Editorial header block */}
        <header className={styles.header}>
          <span className={styles.overline}>Fine Arts Club × VIT Chennai</span>
          <h1 className={styles.title}>
            Techno<span className={styles.titleAccent}>VIT</span>
          </h1>
          <p className={styles.subtitle}>Official Festival Photo Gallery</p>
        </header>

        {/* Divider with artistic diamond flair */}
        <div className={styles.dividerWrap}>
          <div className={styles.dividerLine} />
          <span className={styles.dividerIcon} aria-hidden="true">
            ◆
          </span>
          <div className={styles.dividerLine} />
        </div>

        {/* Anonymous Photo Upload Portal */}
        <section className={styles.uploadSection} aria-label="Photo Upload">
          <PhotoUpload />
        </section>

        {/* Live Approved Photos Gallery */}
        <GalleryMasonry
          initialPhotos={galleryData.photos}
          initialNextCursor={galleryData.nextCursor}
          totalApprovedCount={galleryData.totalApprovedCount}
        />

        {/* Footer */}
        <footer className={styles.footer}>
          <p className={styles.footerText}>
            © {new Date().getFullYear()} Fine Arts Club, VIT Chennai • TechnoVIT Festival
          </p>
        </footer>
      </div>
    </main>
  );
}
