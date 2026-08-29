import { createAdminClient } from "@/lib/supabase/server";
import type { Location, LocationCategory, LocationWithCount, PublicLocation, PublicPhoto } from "@/types";

export { LOCATION_CATEGORY_META } from "./constants";

/**
 * Fetches active locations for the public interactive map.
 * Includes approved photo count and preview photo thumbnails.
 */
export async function getPublicLocations(): Promise<PublicLocation[]> {
  const supabase = createAdminClient();

  // 1. Fetch active locations with coordinates
  const { data: locations, error: locError } = await supabase
    .from("locations")
    .select("id, name, description, map_x, map_y, category, is_active")
    .eq("is_active", true)
    .not("map_x", "is", null)
    .not("map_y", "is", null)
    .order("name", { ascending: true });

  if (locError) {
    console.error("Error fetching public locations:", locError);
    return [];
  }

  if (!locations || locations.length === 0) {
    return [];
  }

  const locationIds = locations.map((l) => l.id);

  // 2. Fetch approved photos associated with these locations
  const { data: photos, error: photoError } = await supabase
    .from("photos")
    .select("id, blurhash, width, height, created_at, location_id, updated_at")
    .eq("status", "approved")
    .in("location_id", locationIds)
    .order("created_at", { ascending: false });

  if (photoError) {
    console.error("Error fetching location preview photos:", photoError);
  }

  // 3. Group photos by location
  const photosByLocation: Record<string, PublicPhoto[]> = {};
  for (const p of photos || []) {
    if (!p.location_id) continue;
    if (!photosByLocation[p.location_id]) {
      photosByLocation[p.location_id] = [];
    }

    const version = new Date(p.updated_at || p.created_at).getTime();
    photosByLocation[p.location_id].push({
      id: p.id,
      blurhash: p.blurhash,
      width: p.width,
      height: p.height,
      created_at: p.created_at,
      location_id: p.location_id,
      thumbUrl: `/api/photos/${p.id}/image?variant=thumb&v=${version}`,
      displayUrl: `/api/photos/${p.id}/image?variant=display&v=${version}`,
    });
  }

  // 4. Map into PublicLocation DTOs
  return locations.map((loc) => {
    const locPhotos = photosByLocation[loc.id] || [];
    return {
      id: loc.id,
      name: loc.name,
      description: loc.description,
      map_x: loc.map_x ?? 0.5,
      map_y: loc.map_y ?? 0.5,
      category: (loc.category as LocationCategory) || "custom",
      approved_photo_count: locPhotos.length,
      preview_photos: locPhotos.slice(0, 4),
    };
  });
}

/**
 * Fetches all approved photos for a specific location.
 */
export async function getPublicLocationPhotos(
  locationId: string,
  limit = 50
): Promise<{ location: PublicLocation | null; photos: PublicPhoto[] }> {
  const supabase = createAdminClient();

  // 1. Fetch location details
  const { data: loc, error: locError } = await supabase
    .from("locations")
    .select("id, name, description, map_x, map_y, category, is_active")
    .eq("id", locationId)
    .eq("is_active", true)
    .single();

  if (locError || !loc) {
    return { location: null, photos: [] };
  }

  // 2. Fetch approved photos
  const { data: rawPhotos, error: photoError } = await supabase
    .from("photos")
    .select("id, blurhash, width, height, created_at, location_id, updated_at")
    .eq("status", "approved")
    .eq("location_id", locationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (photoError) {
    console.error("Error fetching location photos:", photoError);
    return { location: null, photos: [] };
  }

  const photos: PublicPhoto[] = (rawPhotos || []).map((p) => {
    const version = new Date(p.updated_at || p.created_at).getTime();
    return {
      id: p.id,
      blurhash: p.blurhash,
      width: p.width,
      height: p.height,
      created_at: p.created_at,
      location_id: p.location_id,
      thumbUrl: `/api/photos/${p.id}/image?variant=thumb&v=${version}`,
      displayUrl: `/api/photos/${p.id}/image?variant=display&v=${version}`,
    };
  });

  const publicLocation: PublicLocation = {
    id: loc.id,
    name: loc.name,
    description: loc.description,
    map_x: loc.map_x ?? 0.5,
    map_y: loc.map_y ?? 0.5,
    category: (loc.category as LocationCategory) || "custom",
    approved_photo_count: photos.length,
    preview_photos: photos.slice(0, 4),
  };

  return { location: publicLocation, photos };
}

/**
 * Fetches all locations for Super Admin management, including photo statistics.
 */
export async function getAdminLocations(): Promise<LocationWithCount[]> {
  const supabase = createAdminClient();

  // 1. Fetch all locations
  const { data: locations, error: locError } = await supabase
    .from("locations")
    .select("*")
    .order("created_at", { ascending: false });

  if (locError) {
    console.error("Error fetching admin locations:", locError);
    return [];
  }

  if (!locations || locations.length === 0) {
    return [];
  }

  // 2. Fetch photo counts grouped by location and status
  const { data: photoStats, error: statsError } = await supabase
    .from("photos")
    .select("location_id, status")
    .not("location_id", "is", null);

  if (statsError) {
    console.error("Error fetching location photo counts:", statsError);
  }

  const counts: Record<string, { approved: number; total: number }> = {};
  for (const p of photoStats || []) {
    if (!p.location_id) continue;
    if (!counts[p.location_id]) {
      counts[p.location_id] = { approved: 0, total: 0 };
    }
    counts[p.location_id].total += 1;
    if (p.status === "approved") {
      counts[p.location_id].approved += 1;
    }
  }

  return locations.map((loc) => ({
    ...(loc as Location),
    category: (loc.category as LocationCategory) || "custom",
    approved_photo_count: counts[loc.id]?.approved || 0,
    total_photo_count: counts[loc.id]?.total || 0,
  }));
}
