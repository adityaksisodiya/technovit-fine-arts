import { createAdminClient } from "@/lib/supabase/server";
import {
  MAX_UPLOADS_PER_WINDOW,
  RATE_LIMIT_WINDOW_MINUTES,
} from "./constants";

export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  retryAfterSeconds?: number;
}

/**
 * Safely extracts the client's IP address from standard reverse-proxy headers.
 */
export function getClientIp(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0].trim();
    if (firstIp) return firstIp;
  }

  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const cfConnectingIp = headers.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp.trim();

  return "127.0.0.1";
}

/**
 * Evaluates whether an IP address is permitted to upload a new photo.
 *
 * Direct database query against `photos.uploaded_from_ip` within the sliding 15-minute window.
 */
export async function checkUploadRateLimit(
  ipAddress: string
): Promise<RateLimitResult> {
  const supabase = createAdminClient();

  const windowStartTime = new Date(
    Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000
  ).toISOString();

  const { data: recentPhotos, error } = await supabase
    .from("photos")
    .select("created_at")
    .eq("uploaded_from_ip", ipAddress)
    .gte("created_at", windowStartTime)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Rate limit check error:", error);
    // Allow if DB check encounters transient error to prevent blocking legitimate traffic
    return { allowed: true };
  }

  if (recentPhotos && recentPhotos.length >= MAX_UPLOADS_PER_WINDOW) {
    const oldestInWindow = new Date(recentPhotos[0].created_at).getTime();
    const resetTime = oldestInWindow + RATE_LIMIT_WINDOW_MINUTES * 60 * 1000;
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((resetTime - Date.now()) / 1000)
    );

    return {
      allowed: false,
      reason: `Too many photo uploads from your IP address. Please try again in ${Math.ceil(retryAfterSeconds / 60)} minutes.`,
      retryAfterSeconds,
    };
  }

  return { allowed: true };
}
