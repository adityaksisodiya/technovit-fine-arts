"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./CampusMap.module.css";

export function MapPromoPopup() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Check if dismissed in this browser session
    const dismissed = sessionStorage.getItem("technovit_map_promo_dismissed");
    if (dismissed) return;

    const timer = setTimeout(() => {
      setVisible(true);
    }, 7000); // Trigger after 7 seconds

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    sessionStorage.setItem("technovit_map_promo_dismissed", "true");
  };

  if (!visible) return null;

  return (
    <aside
      className={styles.promoPopup}
      role="complementary"
      aria-label="Campus map recommendation"
    >
      <div className={styles.promoIcon} aria-hidden="true">
        🗺️
      </div>

      <div className={styles.promoContent}>
        <h4 className={styles.promoTitle}>Discover Festival Zones</h4>
        <p className={styles.promoText}>
          Want to see where these moments happened? Explore campus photo spots.
        </p>
        <Link
          href="/map"
          className={`btn btn--primary ${styles.promoButton}`}
          onClick={handleDismiss}
        >
          Explore Campus Map ↗
        </Link>
      </div>

      <button
        type="button"
        className={styles.promoClose}
        onClick={handleDismiss}
        aria-label="Dismiss campus map recommendation"
      >
        ✕
      </button>
    </aside>
  );
}
