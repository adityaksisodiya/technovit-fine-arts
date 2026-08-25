-- ============================================================
-- TechnoVIT Fine Arts Club — Photo Gallery
-- Migration 00003: Photo Upload Permissions, Advisory Locks & Atomic Admission
--
-- 1. Grants least-privilege permissions to service_role for server-side photo ingestion
-- 2. Adds index on photos(uploaded_from_ip, created_at DESC) for fast sliding-window lookups
-- 3. Creates `admit_and_create_pending_photo` PostgreSQL function with:
--    - Per-IP transaction advisory lock (serializes rate-limiting per IP)
--    - Global storage budget transaction advisory lock (serializes 7.5 GB hard-stop admission)
--    - Strict REVOKE from PUBLIC, anon, and authenticated (service_role only)
--    - Server-side parameter validation on bounds and types
--
-- IMPORTANT: DO NOT EXECUTE until explicitly approved.
-- ============================================================

-- -------------------------------------------------------
-- 1. SERVICE ROLE TABLE PERMISSIONS
-- Server-side Route Handlers (/api/upload) use service_role
-- to insert pending photos, update storage keys, and verify rate limits.
-- Note: 'anon' and 'authenticated' roles are NOT granted INSERT privileges.
-- -------------------------------------------------------

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.photos TO service_role;
GRANT SELECT, INSERT ON TABLE public.system_events TO service_role;

-- -------------------------------------------------------
-- 2. RATE LIMITING INDEX
-- Supports fast indexed lookups for 15-minute per-IP upload rate limits.
-- -------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_photos_ip_recent
  ON public.photos (uploaded_from_ip, created_at DESC)
  WHERE uploaded_from_ip IS NOT NULL;

-- -------------------------------------------------------
-- 3. ATOMIC ADMISSION & PENDING PHOTO CREATION FUNCTION
-- Uses PostgreSQL Transaction Advisory Locks (pg_advisory_xact_lock)
-- to strictly eliminate all concurrent read/write race conditions across Vercel instances.
-- -------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admit_and_create_pending_photo(
  p_uploaded_from_ip inet,
  p_file_size_bytes bigint,
  p_width integer,
  p_height integer,
  p_blurhash text,
  p_content_type text,
  p_booth_id uuid DEFAULT NULL,
  p_max_storage_bytes bigint DEFAULT 8053063680, -- 7.5 GB in bytes
  p_max_window_uploads integer DEFAULT 10,
  p_window_interval interval DEFAULT interval '15 minutes'
)
RETURNS TABLE (
  id uuid,
  status photo_status
) AS $$
DECLARE
  v_recent_count integer;
  v_total_stored_bytes bigint;
  v_new_id uuid;
  v_ip_lock_key bigint;
  v_storage_lock_key bigint;
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
  --    (Does not block requests from different IP addresses)
  v_ip_lock_key := ('x' || substr(md5('ip_rate_limit:' || host(p_uploaded_from_ip)), 1, 16))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_ip_lock_key);

  -- b) Global Storage Budget Advisory Lock: Serializes storage admission checks
  --    (Held strictly for the sub-millisecond duration of this transaction)
  v_storage_lock_key := ('x' || substr(md5('global_storage_budget_lock'), 1, 16))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_storage_lock_key);

  -- 2. ENFORCE IP RATE LIMIT ATOMICALLY
  SELECT COUNT(*) INTO v_recent_count
  FROM public.photos
  WHERE photos.uploaded_from_ip = p_uploaded_from_ip
    AND photos.created_at >= (now() - p_window_interval);

  IF v_recent_count >= p_max_window_uploads THEN
    RAISE EXCEPTION 'RATE_LIMIT_EXCEEDED: Maximum % uploads per % reached.',
      p_max_window_uploads, p_window_interval
      USING ERRCODE = 'P0001';
  END IF;

  -- 3. ENFORCE STORAGE BUDGET HARD-STOP ATOMICALLY
  SELECT COALESCE(SUM(photos.file_size_bytes), 0) INTO v_total_stored_bytes
  FROM public.photos
  WHERE photos.status IN ('pending', 'approved');

  IF (v_total_stored_bytes + p_file_size_bytes) > p_max_storage_bytes THEN
    RAISE EXCEPTION 'STORAGE_LIMIT_EXCEEDED: Storage capacity limit reached (7.5 GB hard-stop). Uploads are temporarily paused.'
      USING ERRCODE = 'P0003';
  END IF;

  -- 4. INSERT PENDING PHOTO ROW (Atomically updates count & sum for subsequent transactions)
  v_new_id := gen_random_uuid();

  INSERT INTO public.photos (
    id,
    status,
    r2_original_key,
    r2_display_key,
    r2_thumbnail_key,
    blurhash,
    width,
    height,
    file_size_bytes,
    content_type,
    uploaded_from_ip,
    booth_id
  )
  VALUES (
    v_new_id,
    'pending',
    NULL,
    NULL,
    NULL,
    p_blurhash,
    p_width,
    p_height,
    p_file_size_bytes,
    p_content_type,
    p_uploaded_from_ip,
    p_booth_id
  );

  RETURN QUERY
  SELECT v_new_id AS id, 'pending'::photo_status AS status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -------------------------------------------------------
-- 4. STRICT ACCESS CONTROL
-- Revoke execution from PUBLIC, anon, and authenticated.
-- Grant execution strictly to service_role (server-only).
-- -------------------------------------------------------

REVOKE ALL ON FUNCTION public.admit_and_create_pending_photo(inet, bigint, integer, integer, text, text, uuid, bigint, integer, interval) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admit_and_create_pending_photo(inet, bigint, integer, integer, text, text, uuid, bigint, integer, interval) FROM anon;
REVOKE ALL ON FUNCTION public.admit_and_create_pending_photo(inet, bigint, integer, integer, text, text, uuid, bigint, integer, interval) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.admit_and_create_pending_photo(inet, bigint, integer, integer, text, text, uuid, bigint, integer, interval) TO service_role;
