import type { Metadata } from "next";
import { Navbar } from "@/components/Navigation";
import { CampusMap } from "@/components/Map";
import { getPublicLocations } from "@/lib/map/service";

export const revalidate = 60; // Revalidate every 60 seconds

export const metadata: Metadata = {
  title: "Campus Map & Photo Booths — TechnoVIT Fine Arts Club",
  description:
    "Interactive campus map for TechnoVIT at VIT Chennai. Discover photo booth locations, art stations, festival stages, and explore photos from each space.",
};

export default async function MapPage() {
  const locations = await getPublicLocations();

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <Navbar />

      <main style={{ flex: 1, paddingInline: "var(--gutter)" }}>
        <CampusMap initialLocations={locations} />
      </main>

      <footer
        style={{
          borderTop: "1px solid var(--color-border-subtle)",
          padding: "var(--space-8) var(--gutter)",
          textAlign: "center",
          fontSize: "var(--text-xs)",
          color: "var(--color-text-tertiary)",
          fontFamily: "var(--font-mono)",
        }}
      >
        TechnoVIT Festival Map • Fine Arts Club × VIT Chennai • 12.8406° N, 80.1534° E
      </footer>
    </div>
  );
}
