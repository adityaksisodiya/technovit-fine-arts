import type { Metadata } from "next";
import { Navbar } from "@/components/Navigation";
import { EditorialHero } from "@/components/Hero";
import { PhotoWall } from "@/components/Gallery";
import { PhotoUpload } from "@/components/PhotoUpload";
import { MapPromoPopup } from "@/components/Map";
import { getPublicGalleryPhotos } from "@/lib/gallery";
import styles from "./page.module.css";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "TechnoVIT Photo Wall — Fine Arts Club × VIT Chennai",
  description:
    "Explore and share photography from TechnoVIT at VIT Chennai. Browse the living memory wall, locate photo booths, and drop your festival moments.",
  openGraph: {
    title: "TechnoVIT Photo Wall — Fine Arts Club × VIT Chennai",
    description:
      "A living memory installation of TechnoVIT festival moments, curated and captured by the Fine Arts Club.",
    type: "website",
  },
};

export default async function Home() {
  // Initial server-side query for approved photos (fast FCP + SEO)
  const galleryData = await getPublicGalleryPhotos({ limit: 18 });

  return (
    <div className={styles.pageRoot}>
      {/* Sticky Global Navigation */}
      <Navbar />

      <main className={styles.mainContainer}>
        {/* Editorial Hero Intro */}
        <EditorialHero />

        {/* Living Photo Wall (Scattered Composition) */}
        <PhotoWall
          initialPhotos={galleryData.photos}
          initialCursor={galleryData.nextCursor}
          initialHasMore={galleryData.hasMore}
          totalApprovedCount={galleryData.totalApprovedCount}
        />

        {/* Photo Drop Zone */}
        <section id="upload" className={styles.uploadSection} aria-label="Drop Your Photo">
          <div className={styles.uploadHeader}>
            <h2 className={styles.uploadSectionTitle}>Put Your Moment On The Wall</h2>
            <p className={styles.uploadSectionSubtitle}>
              Drop your TechnoVIT memories and become part of the festival story.
            </p>
          </div>

          <PhotoUpload />
        </section>
      </main>

      {/* Floating Map Promotion Popup */}
      <MapPromoPopup />

      {/* Editorial Minimal Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerBrand}>
            <span className={styles.footerClub}>Fine Arts Club</span>
            <span className={styles.footerSub}>VIT Chennai • TechnoVIT Festival</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
