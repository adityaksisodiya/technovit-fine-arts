import { createAdminClient } from "@/lib/supabase/server";
import { headStorageObject } from "@/lib/upload/storage";
import { getB2BucketName, getB2Config } from "@/lib/storage";
import {
  STORAGE_HARD_STOP_BYTES,
  STORAGE_WARN_THRESHOLD_BYTES,
  STORAGE_CRITICAL_THRESHOLD_BYTES,
} from "@/lib/upload/constants";
import { PhotoStatus } from "@/types";

export interface StorageMetrics {
  hardStopBytes: number;
  usedBytes: number;
  remainingBytes: number;
  usedPercentage: number;
  statusLevel: "normal" | "warning" | "critical";
  formattedUsed: string;
  formattedRemaining: string;
  formattedHardStop: string;
}

export interface PhotoCounts {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  deleted: number;
}

export interface UploadMetrics {
  uploadsLast1Hour: number;
  uploadsLast24Hours: number;
  activeIpsInWindow: number;
}

export interface AuditEventItem {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  admin_id: string | null;
  admin_email?: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface B2DiagnosticResult {
  connected: boolean;
  bucketName: string;
  region: string;
  latencyMs: number;
  error?: string;
}

export interface SystemMetricsData {
  storage: StorageMetrics;
  photos: PhotoCounts;
  uploads: UploadMetrics;
  recentAuditLogs: AuditEventItem[];
  b2Diagnostic: B2DiagnosticResult;
  timestamp: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Aggregates complete system, storage, upload, audit, and Backblaze B2 diagnostics.
 */
export async function getSystemAndStorageMetrics(): Promise<SystemMetricsData> {
  const supabase = createAdminClient();

  const now = Date.now();
  const oneHourAgo = new Date(now - 60 * 60 * 1000).toISOString();
  const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const fifteenMinutesAgo = new Date(now - 15 * 60 * 1000).toISOString();

  // 1. Fetch photo rows for counts and storage aggregation
  const { data: allPhotos, error: photosErr } = await supabase
    .from("photos")
    .select("status, file_size_bytes, created_at, uploaded_from_ip");

  if (photosErr) {
    console.error("Failed to query photo metrics:", photosErr);
    throw new Error(`Failed to load photo metrics: ${photosErr.message}`);
  }

  const photosList = allPhotos || [];

  // Calculate photo counts
  let pendingCount = 0;
  let approvedCount = 0;
  let rejectedCount = 0;
  let deletedCount = 0;
  let usedBytes = 0;
  let uploadsLast1Hour = 0;
  let uploadsLast24Hours = 0;
  const activeIps = new Set<string>();

  for (const p of photosList) {
    if (p.status === PhotoStatus.PENDING) pendingCount++;
    else if (p.status === PhotoStatus.APPROVED) approvedCount++;
    else if (p.status === PhotoStatus.REJECTED) rejectedCount++;
    else if (p.status === PhotoStatus.DELETED) deletedCount++;

    // Fail-closed storage reservation counts pending and approved rows
    if (p.status === PhotoStatus.PENDING || p.status === PhotoStatus.APPROVED) {
      usedBytes += p.file_size_bytes || 0;
    }

    if (p.created_at >= oneHourAgo) uploadsLast1Hour++;
    if (p.created_at >= twentyFourHoursAgo) uploadsLast24Hours++;
    if (p.created_at >= fifteenMinutesAgo && p.uploaded_from_ip) {
      activeIps.add(p.uploaded_from_ip);
    }
  }

  const remainingBytes = Math.max(0, STORAGE_HARD_STOP_BYTES - usedBytes);
  const usedPercentage = Math.min(100, (usedBytes / STORAGE_HARD_STOP_BYTES) * 100);

  let statusLevel: "normal" | "warning" | "critical" = "normal";
  if (usedBytes >= STORAGE_CRITICAL_THRESHOLD_BYTES) {
    statusLevel = "critical";
  } else if (usedBytes >= STORAGE_WARN_THRESHOLD_BYTES) {
    statusLevel = "warning";
  }

  const storage: StorageMetrics = {
    hardStopBytes: STORAGE_HARD_STOP_BYTES,
    usedBytes,
    remainingBytes,
    usedPercentage,
    statusLevel,
    formattedUsed: formatBytes(usedBytes),
    formattedRemaining: formatBytes(remainingBytes),
    formattedHardStop: formatBytes(STORAGE_HARD_STOP_BYTES),
  };

  const photos: PhotoCounts = {
    total: photosList.length,
    pending: pendingCount,
    approved: approvedCount,
    rejected: rejectedCount,
    deleted: deletedCount,
  };

  const uploads: UploadMetrics = {
    uploadsLast1Hour,
    uploadsLast24Hours,
    activeIpsInWindow: activeIps.size,
  };

  // 2. Fetch recent audit logs
  const { data: auditRows } = await supabase
    .from("audit_log")
    .select("id, action, entity_type, entity_id, admin_id, ip_address, created_at")
    .order("created_at", { ascending: false })
    .limit(15);

  const adminIds = Array.from(
    new Set((auditRows || []).map((a) => a.admin_id).filter((id): id is string => Boolean(id)))
  );

  let adminEmailMap: Record<string, string> = {};
  if (adminIds.length > 0) {
    const { data: admins } = await supabase
      .from("admin_users")
      .select("id, email")
      .in("id", adminIds);
    if (admins) {
      adminEmailMap = Object.fromEntries(admins.map((a) => [a.id, a.email]));
    }
  }

  const recentAuditLogs: AuditEventItem[] = (auditRows || []).map((a) => ({
    id: a.id,
    action: a.action,
    entity_type: a.entity_type,
    entity_id: a.entity_id,
    admin_id: a.admin_id,
    admin_email: a.admin_id ? adminEmailMap[a.admin_id] : null,
    ip_address: a.ip_address,
    created_at: a.created_at,
  }));

  // 3. Backblaze B2 Connectivity Diagnostic Check
  const b2Config = getB2Config();
  const b2BucketName = getB2BucketName();
  let b2Connected = false;
  let latencyMs = 0;
  let b2Error: string | undefined;

  const startB2 = Date.now();
  try {
    // Non-destructive check to verify S3 handshake
    await headStorageObject("healthcheck/probe.txt");
    b2Connected = true;
    latencyMs = Date.now() - startB2;
  } catch (err: unknown) {
    latencyMs = Date.now() - startB2;
    // 404 is a valid S3 response confirming connection
    const errorObj = err as { name?: string; $metadata?: { httpStatusCode?: number } };
    if (errorObj.name === "NotFound" || errorObj.$metadata?.httpStatusCode === 404) {
      b2Connected = true;
    } else {
      b2Connected = false;
      b2Error = err instanceof Error ? err.message : "S3 handshake failed";
    }
  }

  const b2Diagnostic: B2DiagnosticResult = {
    connected: b2Connected,
    bucketName: b2BucketName,
    region: b2Config.region,
    latencyMs,
    error: b2Error,
  };

  return {
    storage,
    photos,
    uploads,
    recentAuditLogs,
    b2Diagnostic,
    timestamp: new Date().toISOString(),
  };
}
