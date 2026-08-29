-- ============================================================
-- TechnoVIT Fine Arts Club — Photo Gallery
-- Migration 00006: Normalized Map Coordinates, Categories & Super Admin Grants
--
-- 1. Adds normalized map coordinate columns (map_x, map_y) in [0.0, 1.0]
-- 2. Adds category column to public.locations
-- 3. Adds index on public.photos(location_id) for location-based photo queries
-- 4. Grants least-privilege table permissions to service_role on public.locations
-- 5. Tightens RLS policies on public.locations to SUPER_ADMIN only for mutations (INSERT, UPDATE, DELETE)
--
-- IMPORTANT: DO NOT EXECUTE until explicitly approved.
-- ============================================================

-- -------------------------------------------------------
-- 1. ADD NORMALIZED MAP POSITION & CATEGORY COLUMNS
-- -------------------------------------------------------

ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS map_x double precision,
  ADD COLUMN IF NOT EXISTS map_y double precision,
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'custom';

-- Constraints: Ensure normalized map coordinates stay within [0.0, 1.0]
ALTER TABLE public.locations
  DROP CONSTRAINT IF EXISTS locations_map_x_range,
  DROP CONSTRAINT IF EXISTS locations_map_y_range;

ALTER TABLE public.locations
  ADD CONSTRAINT locations_map_x_range CHECK (map_x IS NULL OR (map_x >= 0.0 AND map_x <= 1.0)),
  ADD CONSTRAINT locations_map_y_range CHECK (map_y IS NULL OR (map_y >= 0.0 AND map_y <= 1.0));

-- -------------------------------------------------------
-- 2. CREATE INDEX FOR FAST PHOTO-LOCATION LOOKUPS
-- -------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_photos_location_id
  ON public.photos (location_id)
  WHERE location_id IS NOT NULL;

-- -------------------------------------------------------
-- 3. SERVICE ROLE PRIVILEGES FOR SERVER-SIDE MUTATIONS
-- -------------------------------------------------------

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.locations TO service_role;

-- -------------------------------------------------------
-- 4. TIGHTEN & RE-DECLARE RLS POLICIES (SUPER_ADMIN ONLY FOR ALL MUTATIONS)
-- -------------------------------------------------------

-- Drop old insert/update policies that allowed regular admins
DROP POLICY IF EXISTS "locations_admin_insert" ON public.locations;
DROP POLICY IF EXISTS "locations_admin_update" ON public.locations;
DROP POLICY IF EXISTS "locations_super_admin_insert" ON public.locations;
DROP POLICY IF EXISTS "locations_super_admin_update" ON public.locations;
DROP POLICY IF EXISTS "locations_super_admin_delete" ON public.locations;

-- Super Admin: INSERT locations
CREATE POLICY "locations_super_admin_insert" ON public.locations
  FOR INSERT
  TO authenticated
  WITH CHECK (public.get_current_admin_role() = 'super_admin');

-- Super Admin: UPDATE locations
CREATE POLICY "locations_super_admin_update" ON public.locations
  FOR UPDATE
  TO authenticated
  USING (public.get_current_admin_role() = 'super_admin')
  WITH CHECK (public.get_current_admin_role() = 'super_admin');

-- Super Admin: DELETE locations
CREATE POLICY "locations_super_admin_delete" ON public.locations
  FOR DELETE
  TO authenticated
  USING (public.get_current_admin_role() = 'super_admin');
