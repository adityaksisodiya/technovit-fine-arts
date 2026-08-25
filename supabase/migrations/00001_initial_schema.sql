-- ============================================================
-- TechnoVIT Fine Arts Club — Photo Gallery
-- Database Schema Migration: Initial Tables
--
-- Phase 2C-1: Full schema with RLS policies
--
-- IMPORTANT: DO NOT EXECUTE until explicitly approved.
-- ============================================================

-- -------------------------------------------------------
-- 1. CUSTOM TYPES (Enums)
-- -------------------------------------------------------

CREATE TYPE photo_status AS ENUM ('pending', 'approved', 'rejected', 'deleted');
CREATE TYPE admin_role AS ENUM ('super_admin', 'admin', 'moderator');
CREATE TYPE booth_type AS ENUM ('photo_booth', 'art_station', 'stage');
CREATE TYPE moderation_action AS ENUM ('approved', 'rejected', 'deleted', 'restored');
CREATE TYPE event_severity AS ENUM ('info', 'warning', 'error', 'critical');
CREATE TYPE audit_entity_type AS ENUM ('photo', 'location', 'booth', 'admin', 'setting');

-- -------------------------------------------------------
-- 2. HELPER FUNCTION: auto-update updated_at
-- -------------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -------------------------------------------------------
-- 3. TABLES
-- -------------------------------------------------------

-- ==================== LOCATIONS ====================
CREATE TABLE locations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text,
  latitude    double precision,
  longitude   double precision,
  address     text,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT locations_name_unique UNIQUE (name),
  CONSTRAINT locations_latitude_range CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90)),
  CONSTRAINT locations_longitude_range CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180))
);

CREATE TRIGGER locations_updated_at
  BEFORE UPDATE ON locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================== BOOTHS ====================
CREATE TABLE booths (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text,
  booth_type  booth_type NOT NULL DEFAULT 'photo_booth',
  location_id uuid REFERENCES locations(id) ON DELETE SET NULL,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER booths_updated_at
  BEFORE UPDATE ON booths
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================== ADMIN USERS ====================
-- Links to Supabase Auth via auth.users(id).
-- The id column IS the Supabase Auth user UUID.
CREATE TABLE admin_users (
  id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         text NOT NULL,
  display_name  text,
  role          admin_role NOT NULL DEFAULT 'moderator',
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT admin_users_email_unique UNIQUE (email)
);

CREATE TRIGGER admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================== PHOTOS ====================
CREATE TABLE photos (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title                 text,
  description           text,

  -- Moderation state
  status                photo_status NOT NULL DEFAULT 'pending',

  -- Cloudflare R2 object references (keys, not full URLs)
  r2_original_key       text,          -- archival original (optional, may be large)
  r2_display_key        text,          -- optimized display-size image
  r2_thumbnail_key      text,          -- small thumbnail for grid views
  blurhash              text,          -- compact blur placeholder

  -- Image metadata
  width                 integer,
  height                integer,
  file_size_bytes       bigint,
  content_type          text,

  -- Location / booth association
  location_id           uuid REFERENCES locations(id) ON DELETE SET NULL,
  booth_id              uuid REFERENCES booths(id) ON DELETE SET NULL,

  -- Upload origin (anonymous — no user FK, just IP for rate limiting)
  uploaded_from_ip      inet,

  -- Moderation tracking
  moderated_at          timestamptz,
  moderated_by          uuid REFERENCES admin_users(id) ON DELETE SET NULL,

  -- Timestamps
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT photos_file_size_positive CHECK (file_size_bytes IS NULL OR file_size_bytes > 0),
  CONSTRAINT photos_dimensions_positive CHECK (
    (width IS NULL OR width > 0) AND (height IS NULL OR height > 0)
  ),
  CONSTRAINT photos_moderation_consistency CHECK (
    -- If status is pending, moderated_at and moderated_by should be NULL
    -- If status is approved/rejected/deleted, moderated fields may be populated
    (status = 'pending' AND moderated_at IS NULL AND moderated_by IS NULL)
    OR (status IN ('approved', 'rejected', 'deleted'))
  )
);

CREATE TRIGGER photos_updated_at
  BEFORE UPDATE ON photos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================== MODERATION HISTORY ====================
-- Immutable log of every moderation state change on a photo.
CREATE TABLE moderation_history (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id        uuid NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  admin_id        uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  previous_status photo_status NOT NULL,
  new_status      photo_status NOT NULL,
  action          moderation_action NOT NULL,
  reason          text,
  created_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT moderation_history_status_changed CHECK (previous_status != new_status)
);

-- ==================== AUDIT LOG ====================
-- Records important administrative operations for accountability.
CREATE TABLE audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  action      text NOT NULL,
  entity_type audit_entity_type NOT NULL,
  entity_id   uuid,
  old_values  jsonb,
  new_values  jsonb,
  ip_address  inet,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ==================== SYSTEM EVENTS ====================
-- Application monitoring events (upload failures, storage warnings, etc.)
CREATE TABLE system_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  severity    event_severity NOT NULL DEFAULT 'info',
  subsystem   text NOT NULL,
  event_type  text NOT NULL,
  message     text,
  metadata    jsonb,
  is_resolved boolean NOT NULL DEFAULT false,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

-- ==================== STORAGE SNAPSHOTS ====================
-- Periodic storage usage monitoring data.
CREATE TABLE storage_snapshots (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_provider text NOT NULL DEFAULT 'cloudflare_r2',
  quota_bytes      bigint,
  used_bytes       bigint NOT NULL DEFAULT 0,
  total_objects    integer NOT NULL DEFAULT 0,
  pending_objects  integer NOT NULL DEFAULT 0,
  approved_objects integer NOT NULL DEFAULT 0,
  usage_percentage numeric(5,2),
  captured_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT storage_snapshots_usage_range CHECK (
    usage_percentage IS NULL OR (usage_percentage >= 0 AND usage_percentage <= 100)
  ),
  CONSTRAINT storage_snapshots_bytes_non_negative CHECK (used_bytes >= 0),
  CONSTRAINT storage_snapshots_objects_non_negative CHECK (
    total_objects >= 0 AND pending_objects >= 0 AND approved_objects >= 0
  )
);

-- ==================== APP SETTINGS ====================
-- Non-secret application configuration key-value store.
-- DO NOT store credentials, API keys, passwords, or tokens here.
CREATE TABLE app_settings (
  key         text PRIMARY KEY,
  value       text NOT NULL,
  description text,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid REFERENCES admin_users(id) ON DELETE SET NULL
);

CREATE TRIGGER app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -------------------------------------------------------
-- 4. INDEXES
-- -------------------------------------------------------

-- Photos: gallery pagination (approved photos, newest first)
CREATE INDEX idx_photos_gallery
  ON photos (created_at DESC)
  WHERE status = 'approved';

-- Photos: moderation queue (pending photos, oldest first)
CREATE INDEX idx_photos_moderation_queue
  ON photos (created_at ASC)
  WHERE status = 'pending';

-- Photos: filter by status
CREATE INDEX idx_photos_status ON photos (status);

-- Photos: filter by location
CREATE INDEX idx_photos_location_id ON photos (location_id)
  WHERE location_id IS NOT NULL;

-- Photos: filter by booth
CREATE INDEX idx_photos_booth_id ON photos (booth_id)
  WHERE booth_id IS NOT NULL;

-- Moderation history: lookup by photo
CREATE INDEX idx_moderation_history_photo_id ON moderation_history (photo_id);

-- Moderation history: lookup by admin
CREATE INDEX idx_moderation_history_admin_id ON moderation_history (admin_id);

-- Audit log: lookup by entity
CREATE INDEX idx_audit_log_entity
  ON audit_log (entity_type, entity_id);

-- Audit log: chronological lookup by admin
CREATE INDEX idx_audit_log_admin_id ON audit_log (admin_id, created_at DESC);

-- System events: unresolved events
CREATE INDEX idx_system_events_unresolved
  ON system_events (occurred_at DESC)
  WHERE is_resolved = false;

-- System events: by severity
CREATE INDEX idx_system_events_severity ON system_events (severity, occurred_at DESC);

-- Storage snapshots: latest first
CREATE INDEX idx_storage_snapshots_captured_at ON storage_snapshots (captured_at DESC);

-- Booths: by location
CREATE INDEX idx_booths_location_id ON booths (location_id)
  WHERE location_id IS NOT NULL;

-- Locations: active locations for map
CREATE INDEX idx_locations_active ON locations (is_active)
  WHERE is_active = true;

-- -------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) — Enable on all tables
-- -------------------------------------------------------

ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE booths ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------
-- 6. RLS HELPER FUNCTION
--    Returns the admin_role for the currently authenticated user,
--    or NULL if not an active admin.
-- -------------------------------------------------------

CREATE OR REPLACE FUNCTION get_current_admin_role()
RETURNS admin_role AS $$
  SELECT role FROM admin_users
  WHERE id = auth.uid() AND is_active = true;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- -------------------------------------------------------
-- 7. RLS POLICIES
-- -------------------------------------------------------

-- ==================== PHOTOS ====================

-- Public: read APPROVED photos only
CREATE POLICY "photos_public_select" ON photos
  FOR SELECT
  TO anon, authenticated
  USING (status = 'approved');

-- Admin/Moderator: read ALL photos (for moderation queue, management)
CREATE POLICY "photos_admin_select" ON photos
  FOR SELECT
  TO authenticated
  USING (get_current_admin_role() IS NOT NULL);

-- Admin/Moderator: update photo status (moderation), metadata
CREATE POLICY "photos_admin_update" ON photos
  FOR UPDATE
  TO authenticated
  USING (get_current_admin_role() IS NOT NULL)
  WITH CHECK (get_current_admin_role() IS NOT NULL);

-- Super Admin / Admin: delete photos
CREATE POLICY "photos_admin_delete" ON photos
  FOR DELETE
  TO authenticated
  USING (get_current_admin_role() IN ('super_admin', 'admin'));

-- NOTE: Photo INSERT is handled server-side via the privileged admin client
-- (createAdminClient) during the upload confirmation flow. Anonymous users
-- do not insert directly into the photos table via RLS.
-- If a future architecture requires anon INSERT, add a tightly scoped policy.

-- ==================== LOCATIONS ====================

-- Public: read active locations
CREATE POLICY "locations_public_select" ON locations
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Admin: read all locations (including inactive)
CREATE POLICY "locations_admin_select" ON locations
  FOR SELECT
  TO authenticated
  USING (get_current_admin_role() IN ('super_admin', 'admin'));

-- Admin: insert locations
CREATE POLICY "locations_admin_insert" ON locations
  FOR INSERT
  TO authenticated
  WITH CHECK (get_current_admin_role() IN ('super_admin', 'admin'));

-- Admin: update locations
CREATE POLICY "locations_admin_update" ON locations
  FOR UPDATE
  TO authenticated
  USING (get_current_admin_role() IN ('super_admin', 'admin'))
  WITH CHECK (get_current_admin_role() IN ('super_admin', 'admin'));

-- Super Admin: delete locations
CREATE POLICY "locations_super_admin_delete" ON locations
  FOR DELETE
  TO authenticated
  USING (get_current_admin_role() = 'super_admin');

-- ==================== BOOTHS ====================

-- Public: read active booths
CREATE POLICY "booths_public_select" ON booths
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Admin: read all booths
CREATE POLICY "booths_admin_select" ON booths
  FOR SELECT
  TO authenticated
  USING (get_current_admin_role() IN ('super_admin', 'admin'));

-- Admin: insert booths
CREATE POLICY "booths_admin_insert" ON booths
  FOR INSERT
  TO authenticated
  WITH CHECK (get_current_admin_role() IN ('super_admin', 'admin'));

-- Admin: update booths
CREATE POLICY "booths_admin_update" ON booths
  FOR UPDATE
  TO authenticated
  USING (get_current_admin_role() IN ('super_admin', 'admin'))
  WITH CHECK (get_current_admin_role() IN ('super_admin', 'admin'));

-- Super Admin: delete booths
CREATE POLICY "booths_super_admin_delete" ON booths
  FOR DELETE
  TO authenticated
  USING (get_current_admin_role() = 'super_admin');

-- ==================== ADMIN USERS ====================

-- Authenticated admins: read own profile
CREATE POLICY "admin_users_self_select" ON admin_users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid() AND is_active = true);

-- Admin/Super Admin: read all admin profiles
CREATE POLICY "admin_users_admin_select" ON admin_users
  FOR SELECT
  TO authenticated
  USING (get_current_admin_role() IN ('super_admin', 'admin'));

-- Super Admin: full CRUD on admin_users
CREATE POLICY "admin_users_super_admin_insert" ON admin_users
  FOR INSERT
  TO authenticated
  WITH CHECK (get_current_admin_role() = 'super_admin');

CREATE POLICY "admin_users_super_admin_update" ON admin_users
  FOR UPDATE
  TO authenticated
  USING (get_current_admin_role() = 'super_admin')
  WITH CHECK (get_current_admin_role() = 'super_admin');

CREATE POLICY "admin_users_super_admin_delete" ON admin_users
  FOR DELETE
  TO authenticated
  USING (get_current_admin_role() = 'super_admin');

-- ==================== MODERATION HISTORY ====================
-- No public access. Only admins can read.

-- Moderator: read own moderation actions
CREATE POLICY "moderation_history_self_select" ON moderation_history
  FOR SELECT
  TO authenticated
  USING (
    admin_id = auth.uid()
    AND get_current_admin_role() IS NOT NULL
  );

-- Admin/Super Admin: read all moderation history
CREATE POLICY "moderation_history_admin_select" ON moderation_history
  FOR SELECT
  TO authenticated
  USING (get_current_admin_role() IN ('super_admin', 'admin'));

-- INSERT is handled server-side via privileged client during moderation.
-- No direct INSERT policy for RLS — prevents tampering.

-- ==================== AUDIT LOG ====================
-- No public access. Only Admin/Super Admin can read.

CREATE POLICY "audit_log_admin_select" ON audit_log
  FOR SELECT
  TO authenticated
  USING (get_current_admin_role() IN ('super_admin', 'admin'));

-- INSERT is handled server-side via privileged client.

-- ==================== SYSTEM EVENTS ====================
-- No public access. Only Admin/Super Admin can read.

CREATE POLICY "system_events_admin_select" ON system_events
  FOR SELECT
  TO authenticated
  USING (get_current_admin_role() IN ('super_admin', 'admin'));

-- INSERT/UPDATE is handled server-side via privileged client.

-- ==================== STORAGE SNAPSHOTS ====================
-- No public access. Only Admin/Super Admin can read.

CREATE POLICY "storage_snapshots_admin_select" ON storage_snapshots
  FOR SELECT
  TO authenticated
  USING (get_current_admin_role() IN ('super_admin', 'admin'));

-- INSERT is handled server-side via privileged client.

-- ==================== APP SETTINGS ====================
-- No public access. Read by all admins. Write by Super Admin.

CREATE POLICY "app_settings_admin_select" ON app_settings
  FOR SELECT
  TO authenticated
  USING (get_current_admin_role() IS NOT NULL);

CREATE POLICY "app_settings_super_admin_insert" ON app_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (get_current_admin_role() = 'super_admin');

CREATE POLICY "app_settings_super_admin_update" ON app_settings
  FOR UPDATE
  TO authenticated
  USING (get_current_admin_role() = 'super_admin')
  WITH CHECK (get_current_admin_role() = 'super_admin');

CREATE POLICY "app_settings_super_admin_delete" ON app_settings
  FOR DELETE
  TO authenticated
  USING (get_current_admin_role() = 'super_admin');

-- -------------------------------------------------------
-- 8. SEED: Default App Settings
-- -------------------------------------------------------

INSERT INTO app_settings (key, value, description) VALUES
  ('max_upload_size_bytes', '10485760', 'Maximum file size for photo uploads (10 MB)'),
  ('allowed_mime_types', 'image/jpeg,image/png,image/webp', 'Comma-separated list of accepted image MIME types'),
  ('upload_rate_limit_per_ip', '10', 'Maximum uploads per IP address per 15-minute window'),
  ('storage_warn_threshold_pct', '70', 'Storage usage percentage that triggers a warning alert'),
  ('storage_critical_threshold_pct', '90', 'Storage usage percentage that triggers a critical alert'),
  ('thumbnail_max_width', '400', 'Maximum width in pixels for generated thumbnails'),
  ('display_max_width', '1600', 'Maximum width in pixels for display-size images'),
  ('gallery_page_size', '24', 'Number of photos per page in the public gallery');
