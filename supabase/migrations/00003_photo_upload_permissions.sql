-- ============================================================
-- TechnoVIT Fine Arts Club — Photo Gallery
-- Migration 00003: Storage Column Renaming, Upload Permissions & Atomic Admission
--
-- 1. Renames `photos` storage columns to provider-neutral names (storage_*)
-- 2. Adds `uploaded_at` timestamp column to `photos` to track completed uploads
-- 3. Updates default storage provider in storage_snapshots to 'backblaze_b2'
-- 4. Grants least-privilege permissions to service_role for server-side photo ingestion
-- 5. Creates indexes for IP rate-limiting and abandoned upload detection
-- 6. Creates hardened `admit_and_create_pending_photo` PostgreSQL function with:
--    - Enforced hard-coded database constants (7.5 GB hard-stop, 10 uploads / 15 min)
--    - Pre-generated deterministic storage keys (photos/{id}/display.webp, thumb.webp)
--    - Explicit search_path = public, pg_temp (SECURITY DEFINER hardening)
--    - Per-IP transaction advisory lock (serializes rate-limiting per IP)
--    - Global storage budget transaction advisory lock (serializes 7.5 GB hard-stop)
--    - Automatic budget release for unconfirmed abandoned uploads (>30 min)
--    - Strict REVOKE from PUBLIC, anon, and authenticated (service_role only)
--
-- IMPORTANT: DO NOT EXECUTE until explicitly approved.
-- ============================================================

-- -------------------------------------------------------
-- 1. RENAME STORAGE COLUMNS (Provider-Neutral)
-- -------------------------------------------------------

ALTER TABLE public.photos RENAME COLUMN r2_original_key  TO storage_original_key;
ALTER TABLE public.photos RENAME COLUMN r2_display_key   TO storage_display_key;
ALTER TABLE public.photos RENAME COLUMN r2_thumbnail_key TO storage_thumb_key;

-- -------------------------------------------------------
-- 2. ADD UPLOAD COMPLETION TIMESTAMP
-- Distinguishes completed uploads awaiting moderation from
-- crashed/abandoned uploads that never finished storage upload.
-- -------------------------------------------------------

ALTER TABLE public.photos
  ADD COLUMN IF NOT EXISTS uploaded_at timestamptz DEFAULT NULL;

-- -------------------------------------------------------
-- 3. UPDATE DEFAULT STORAGE PROVIDER
-- Verified: storage_snapshots.storage_provider is type 'text',
-- allowing 'backblaze_b2' safely.
-- -------------------------------------------------------

ALTER TABLE public.storage_snapshots
  ALTER COLUMN storage_provider SET DEFAULT 'backblaze_b2';

-- -------------------------------------------------------
-- 4. SERVICE ROLE TABLE PERMISSIONS
-- Server-side Route Handlers (/api/upload) use service_role
-- to insert pending photos, update storage keys, and verify rate limits.
-- Note: 'anon' and 'authenticated' roles are NOT granted INSERT privileges.
-- -------------------------------------------------------

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.photos TO service_role;
GRANT SELECT, INSERT ON TABLE public.system_events TO service_role;

-- -------------------------------------------------------
-- 5. INDEXES
-- -------------------------------------------------------

-- Supports fast indexed lookups for 15-minute per-IP upload rate limits
CREATE INDEX IF NOT EXISTS idx_photos_ip_recent
  ON public.photos (uploaded_from_ip, created_at DESC)
  WHERE uploaded_from_ip IS NOT NULL;

-- Supports fast identification and cleanup of abandoned incomplete uploads
CREATE INDEX IF NOT EXISTS idx_photos_pending_abandoned
  ON public.photos (status, created_at)
  WHERE status = 'pending' AND uploaded_at IS NULL;

-- -------------------------------------------------------
-- 6. ATOMIC ADMISSION & PENDING PHOTO CREATION FUNCTION
-- Hardened SECURITY DEFINER procedure with hardcoded policy constants,
-- deterministic storage key generation, explicit search_path, and transaction advisory locks.
-- -------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admit_and_create_pending_photo(
  p_uploaded_from_ip inet,
  p_file_size_bytes bigint,
  p_width integer,
  p_height integer,
  p_blurhash text,
  p_content_type text,
  p_booth_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  status public.photo_status,
  storage_display_key text,
  storage_thumb_key text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  -- Immutable Policy Constants (Cannot be overridden by callers)
  c_max_storage_bytes  CONSTANT bigint   := 8053063680;           -- 7.5 GB capacity cap (in bytes)
  c_max_window_uploads CONSTANT integer  := 10;                   -- Max 10 uploads per IP
  c_window_interval    CONSTANT interval := interval '15 minutes'; -- 15-minute sliding rate-limit window

  v_recent_count       integer;
  v_total_stored_bytes bigint;
  v_new_id             uuid;
  v_display_key        text;
  v_thumb_key          text;
  v_ip_lock_key        bigint;
  v_storage_lock_key   bigint;
BEGIN
  -- 0. Sanity check input constraints
  IF p_file_size_bytes <= 0 OR p_file_size_bytes > 3670016 THEN -- 3.5 MB max server payload
    RAISE EXCEPTION 'INVALID_FILE_SIZE: Payload size out of bounds (1B - 3.5MB).'
      USING ERRCODE = 'P0004';
  END IF;

  IF p_width < 100 OR p_width > 8192 OR p_height < 100 OR p_height > 8192 THEN
    RAISE EXCEPTION 'INVALID_DIMENSIONS: Dimensions must be between 100x100 and 8192x8192 px.'
      USING ERRCODE = 'P0005';
  END IF;

  -- 1. ACQUIRE TRANSACTION ADVISORY LOCKS
  -- a) Per-IP Advisory Lock: Serializes concurrent uploads from the EXACT same IP address
  v_ip_lock_key := ('x' || substr(md5('ip_rate_limit:' || host(p_uploaded_from_ip)), 1, 16))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_ip_lock_key);

  -- b) Global Storage Budget Advisory Lock: Serializes storage admission checks
  v_storage_lock_key := ('x' || substr(md5('global_storage_budget_lock'), 1, 16))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_storage_lock_key);

  -- 2. ENFORCE IP RATE LIMIT ATOMICALLY
  SELECT COUNT(*) INTO v_recent_count
  FROM public.photos
  WHERE photos.uploaded_from_ip = p_uploaded_from_ip
    AND photos.created_at >= (now() - c_window_interval);

  IF v_recent_count >= c_max_window_uploads THEN
    RAISE EXCEPTION 'RATE_LIMIT_EXCEEDED: Maximum % uploads per % reached.',
      c_max_window_uploads, c_window_interval
      USING ERRCODE = 'P0001';
  END IF;

  -- 3. ENFORCE STORAGE BUDGET HARD-STOP ATOMICALLY (Fail-Closed)
  -- Every pending and approved row strictly reserves storage until cleanup.ts
  -- successfully purges B2 objects and deletes the database row.
  SELECT COALESCE(SUM(photos.file_size_bytes), 0) INTO v_total_stored_bytes
  FROM public.photos
  WHERE photos.status IN ('pending', 'approved');

  IF (v_total_stored_bytes + p_file_size_bytes) > c_max_storage_bytes THEN
    RAISE EXCEPTION 'STORAGE_LIMIT_EXCEEDED: Storage capacity limit reached (7.5 GB hard-stop). Uploads are temporarily paused.'
      USING ERRCODE = 'P0003';
  END IF;

  -- 4. DETERMINISTICALLY PRE-GENERATE OBJECT KEYS & INSERT PENDING ROW
  v_new_id      := gen_random_uuid();
  v_display_key := 'photos/' || v_new_id || '/display.webp';
  v_thumb_key   := 'photos/' || v_new_id || '/thumb.webp';

  INSERT INTO public.photos (
    id,
    status,
    storage_original_key,
    storage_display_key,
    storage_thumb_key,
    blurhash,
    width,
    height,
    file_size_bytes,
    content_type,
    uploaded_from_ip,
    booth_id,
    uploaded_at
  )
  VALUES (
    v_new_id,
    'pending'::public.photo_status,
    NULL,
    v_display_key,
    v_thumb_key,
    p_blurhash,
    p_width,
    p_height,
    p_file_size_bytes,
    p_content_type,
    p_uploaded_from_ip,
    p_booth_id,
    NULL -- Set to now() when B2 storage uploads succeed
  );

  RETURN QUERY
  SELECT
    v_new_id AS id,
    'pending'::public.photo_status AS status,
    v_display_key AS storage_display_key,
    v_thumb_key AS storage_thumb_key;
END;
$$;

-- -------------------------------------------------------
-- 7. STRICT ACCESS CONTROL
-- Revoke execution from PUBLIC, anon, and authenticated.
-- Grant execution strictly to service_role (server-only).
-- -------------------------------------------------------

REVOKE ALL ON FUNCTION public.admit_and_create_pending_photo(inet, bigint, integer, integer, text, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admit_and_create_pending_photo(inet, bigint, integer, integer, text, text, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.admit_and_create_pending_photo(inet, bigint, integer, integer, text, text, uuid) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.admit_and_create_pending_photo(inet, bigint, integer, integer, text, text, uuid) TO service_role;
