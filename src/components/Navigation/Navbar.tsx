"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ASSETS } from "@/config/assets";
import styles from "./Navbar.module.css";

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const isMapPage = pathname === "/map";
  const isHomePage = pathname === "/";

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        {/* Brand / Dual Logo */}
        <div className={styles.brandGroup}>
          {/* Fine Arts Club Brand Link (Navigates to facvitc.in) */}
          <a
            href="https://facvitc.in/"
            className={styles.facBrandLink}
            aria-label="Fine Arts Club VIT Chennai — Official Website"
            onClick={() => setMobileOpen(false)}
          >
            <div className={styles.clubLogo}>
              <div className={styles.facLogoWrapper}>
                <Image
                  src={ASSETS.logos.fineArtsClub.src}
                  alt={ASSETS.logos.fineArtsClub.alt}
                  width={34}
                  height={34}
                  className={styles.facLogoImg}
                  priority
                />
              </div>
              <div className={styles.logoTextContainer}>
                <span className={styles.clubTitle}>TechnoVIT</span>
                <span className={styles.clubSubtitle}>Fine Arts Club</span>
              </div>
            </div>
          </a>

          <div className={styles.divider} aria-hidden="true" />

          {/* VIT Chennai Official Brand Badge */}
          <div className={styles.vitBrandWrapper} title={ASSETS.logos.vitChennai.alt}>
            <Image
              src={ASSETS.logos.vitChennai.src}
              alt={ASSETS.logos.vitChennai.alt}
              width={120}
              height={34}
              className={styles.vitLogoImg}
              priority
            />
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className={styles.navLinks} aria-label="Main Navigation">
          <Link
            href="/"
            className={`${styles.navLink} ${isHomePage ? styles.navLinkActive : ""}`}
          >
            Photo Wall
          </Link>

          <Link
            href="/map"
            id="nav-map-link"
            className={`${styles.navLink} ${isMapPage ? styles.navLinkActive : ""}`}
          >
            Campus Map
          </Link>

          <Link
            href="/#upload"
            className={`${styles.navLink} ${styles.navLinkSpecial}`}
          >
            + Drop Moment
          </Link>
        </nav>

        {/* Mobile Hamburger Toggle */}
        <button
          type="button"
          className={styles.mobileToggle}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-expanded={mobileOpen}
          aria-label="Toggle navigation menu"
        >
          {mobileOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileOpen && (
        <div className={styles.mobileDrawer}>
          <Link
            href="/"
            className={styles.mobileLink}
            onClick={() => setMobileOpen(false)}
          >
            <span>🖼️ Photo Wall</span>
            <span>→</span>
          </Link>

          <Link
            href="/map"
            className={styles.mobileLink}
            onClick={() => setMobileOpen(false)}
          >
            <span>🗺️ Campus Map</span>
            <span>→</span>
          </Link>

          <Link
            href="/#upload"
            className={styles.mobileLink}
            style={{ backgroundColor: "var(--color-accent-primary)", color: "#ffffff" }}
            onClick={() => setMobileOpen(false)}
          >
            <span>📸 Drop Your Memory</span>
            <span>+</span>
          </Link>
        </div>
      )}
    </header>
  );
}
