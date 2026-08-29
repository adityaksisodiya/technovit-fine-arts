"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/server";
import { AdminRole, type LocationCategory } from "@/types";

export interface ActionState {
  success: boolean;
  message?: string;
  error?: string;
  locationId?: string;
}

/**
 * Creates a new location on the map (Super Admin only).
 */
export async function createLocationAction(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  try {
    const admin = await requireAdmin(AdminRole.SUPER_ADMIN, "/admin/map");
    const supabase = createAdminClient();

    const name = (formData.get("name") as string)?.trim();
    const description = (formData.get("description") as string)?.trim() || null;
    const category = (formData.get("category") as LocationCategory) || "custom";
    const mapXRaw = formData.get("map_x") as string;
    const mapYRaw = formData.get("map_y") as string;
    const isActive = formData.get("is_active") !== "false";

    if (!name) {
      return { success: false, error: "Location name is required." };
    }

    const map_x = mapXRaw ? Math.max(0, Math.min(1, parseFloat(mapXRaw))) : 0.5;
    const map_y = mapYRaw ? Math.max(0, Math.min(1, parseFloat(mapYRaw))) : 0.5;

    const { data: newLoc, error } = await supabase
      .from("locations")
      .insert({
        name,
        description,
        category,
        map_x,
        map_y,
        is_active: isActive,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error creating location:", error);
      if (error.code === "23505") {
        return { success: false, error: "A location with this name already exists." };
      }
      return { success: false, error: `Failed to create location: ${error.message}` };
    }

    // Audit log
    await supabase.from("audit_log").insert({
      admin_id: admin.id,
      entity_type: "location",
      entity_id: newLoc.id,
      action: "create_location",
      details: { name, category, map_x, map_y },
    });

    revalidatePath("/admin/map");
    revalidatePath("/map");
    revalidatePath("/");

    return { success: true, message: `Location "${name}" created successfully.`, locationId: newLoc.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return { success: false, error: message };
  }
}

/**
 * Updates an existing location's details (Super Admin only).
 */
export async function updateLocationAction(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  try {
    const admin = await requireAdmin(AdminRole.SUPER_ADMIN, "/admin/map");
    const supabase = createAdminClient();

    const id = formData.get("id") as string;
    const name = (formData.get("name") as string)?.trim();
    const description = (formData.get("description") as string)?.trim() || null;
    const category = (formData.get("category") as LocationCategory) || "custom";
    const isActive = formData.get("is_active") === "true";

    if (!id || !name) {
      return { success: false, error: "Location ID and name are required." };
    }

    const { error } = await supabase
      .from("locations")
      .update({
        name,
        description,
        category,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("Error updating location:", error);
      return { success: false, error: `Failed to update location: ${error.message}` };
    }

    // Audit log
    await supabase.from("audit_log").insert({
      admin_id: admin.id,
      entity_type: "location",
      entity_id: id,
      action: "update_location",
      details: { name, category, is_active: isActive },
    });

    revalidatePath("/admin/map");
    revalidatePath("/map");
    revalidatePath("/");

    return { success: true, message: `Location "${name}" updated successfully.` };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return { success: false, error: message };
  }
}

/**
 * Repositions a marker on the map via normalized coordinates (Super Admin only).
 */
export async function updateLocationPositionAction(
  id: string,
  map_x: number,
  map_y: number
): Promise<ActionState> {
  try {
    const admin = await requireAdmin(AdminRole.SUPER_ADMIN, "/admin/map");
    const supabase = createAdminClient();

    const clampedX = Math.max(0, Math.min(1, map_x));
    const clampedY = Math.max(0, Math.min(1, map_y));

    const { error } = await supabase
      .from("locations")
      .update({
        map_x: clampedX,
        map_y: clampedY,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("Error updating location position:", error);
      return { success: false, error: error.message };
    }

    // Audit log
    await supabase.from("audit_log").insert({
      admin_id: admin.id,
      entity_type: "location",
      entity_id: id,
      action: "reposition_location",
      details: { map_x: clampedX, map_y: clampedY },
    });

    revalidatePath("/admin/map");
    revalidatePath("/map");

    return { success: true, message: "Marker position updated." };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return { success: false, error: message };
  }
}

/**
 * Toggles a location active/disabled status (Super Admin only).
 */
export async function toggleLocationStatusAction(
  id: string,
  isActive: boolean
): Promise<ActionState> {
  try {
    const admin = await requireAdmin(AdminRole.SUPER_ADMIN, "/admin/map");
    const supabase = createAdminClient();

    const { error } = await supabase
      .from("locations")
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("Error toggling location status:", error);
      return { success: false, error: error.message };
    }

    // Audit log
    await supabase.from("audit_log").insert({
      admin_id: admin.id,
      entity_type: "location",
      entity_id: id,
      action: isActive ? "enable_location" : "disable_location",
    });

    revalidatePath("/admin/map");
    revalidatePath("/map");

    return { success: true, message: `Location ${isActive ? "enabled" : "disabled"}.` };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return { success: false, error: message };
  }
}

/**
 * Deletes a location (Super Admin only).
 * PostgreSQL foreign key constraint ON DELETE SET NULL automatically retains all photos.
 */
export async function deleteLocationAction(id: string): Promise<ActionState> {
  try {
    const admin = await requireAdmin(AdminRole.SUPER_ADMIN, "/admin/map");
    const supabase = createAdminClient();

    // 1. Fetch location name for audit
    const { data: loc } = await supabase
      .from("locations")
      .select("name")
      .eq("id", id)
      .single();

    // 2. Delete location
    const { error } = await supabase
      .from("locations")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting location:", error);
      return { success: false, error: `Failed to delete location: ${error.message}` };
    }

    // 3. Audit log
    await supabase.from("audit_log").insert({
      admin_id: admin.id,
      entity_type: "location",
      entity_id: id,
      action: "delete_location",
      details: { name: loc?.name || id },
    });

    revalidatePath("/admin/map");
    revalidatePath("/admin/photos");
    revalidatePath("/map");
    revalidatePath("/");

    return { success: true, message: `Location "${loc?.name || id}" deleted successfully.` };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return { success: false, error: message };
  }
}

/**
 * Assigns or unassigns a photograph to a location (Admin & Super Admin).
 */
export async function assignPhotoLocationAction(
  photoId: string,
  locationId: string | null
): Promise<ActionState> {
  try {
    const admin = await requireAdmin(AdminRole.ADMIN, "/admin/photos");
    const supabase = createAdminClient();

    const { error } = await supabase
      .from("photos")
      .update({
        location_id: locationId || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", photoId);

    if (error) {
      console.error("Error assigning photo location:", error);
      return { success: false, error: `Failed to assign location: ${error.message}` };
    }

    // Audit log
    await supabase.from("audit_log").insert({
      admin_id: admin.id,
      entity_type: "photo",
      entity_id: photoId,
      action: "update_photo_location",
      details: { location_id: locationId },
    });

    revalidatePath("/admin/photos");
    revalidatePath("/admin/map");
    revalidatePath("/map");
    revalidatePath("/");

    return { success: true, message: "Photo location updated." };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return { success: false, error: message };
  }
}
