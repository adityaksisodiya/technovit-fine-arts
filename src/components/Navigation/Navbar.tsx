"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ASSETS } from "@/config/assets";
import styles from "./Navbar.module.css";

const FAC_WEBSITE_URL = "https://facvitc.in/";
const FAC_INSTAGRAM_URL = "https://www.instagram.com/facvitcc?igsi=MWhmMWU5Ynp5cWozOA==";

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
            href={FAC_WEBSITE_URL}
            className={styles.facBrandLink}
            aria-label={ASSETS.logos.fineArtsClub.alt}
            title={ASSETS.logos.fineArtsClub.alt}
            onClick={() => setMobileOpen(false)}
          >
            <div className={styles.facLogoWrapper}>
              <Image
                src={ASSETS.logos.fineArtsClub.src}
                alt={ASSETS.logos.fineArtsClub.alt}
                width={38}
                height={40}
                className={styles.facLogoImg}
                priority
              />
            </div>
          </a>

          <div className={styles.divider} aria-hidden="true" />

          {/* VIT Chennai Official Brand (No background / card container) */}
          <div className={styles.vitLogoWrapper} title={ASSETS.logos.vitChennai.alt}>
            <Image
              src={ASSETS.logos.vitChennai.src}
              alt={ASSETS.logos.vitChennai.alt}
              width={96}
              height={31}
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

          <a
            href={FAC_WEBSITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.navLink}
            aria-label="Fine Arts Club Website"
          >
            Fine Arts Club
          </a>

          <a
            href={FAC_INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={`${styles.navLink} ${styles.navLinkWithIcon}`}
            aria-label="Fine Arts Club Instagram"
          >
            <svg
              className={styles.navIcon}
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
            </svg>
            <span>Instagram</span>
          </a>

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

          <a
            href={FAC_WEBSITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.mobileLink}
            onClick={() => setMobileOpen(false)}
          >
            <span>🎨 Fine Arts Club</span>
            <span>↗</span>
          </a>

          <a
            href={FAC_INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.mobileLink}
            onClick={() => setMobileOpen(false)}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
              Instagram
            </span>
            <span>↗</span>
          </a>

          <Link
            href="/#upload"
            className={styles.mobileLink}
            style={{ backgroundColor: "var(--color-accent-primary)", color: "#0D1B2A", fontWeight: 700 }}
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
