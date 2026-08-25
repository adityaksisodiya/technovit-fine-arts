-- ============================================================
-- TechnoVIT Fine Arts Club — Photo Gallery
-- Migration 00002: Least-Privilege API Role Permissions
--
-- Grants the minimum necessary PostgreSQL table-level privileges
-- to PostgREST API roles (anon and authenticated).
-- Row Level Security (RLS) policies continue to enforce row-level
-- authorization on top of these table-level grants.
--
-- IMPORTANT: DO NOT EXECUTE until explicitly approved.
-- ============================================================

-- -------------------------------------------------------
-- 1. SCHEMA USAGE
-- Allow API roles to resolve objects in public schema.
-- -------------------------------------------------------

GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- -------------------------------------------------------
-- 2. ANONYMOUS ROLE (anon) — Public Visitors
-- Only read access to public gallery data.
-- RLS policies restrict visible rows to active/approved items only.
-- -------------------------------------------------------

-- Public Gallery: Read approved photos (filtered by photos_public_select RLS)
GRANT SELECT ON TABLE public.photos TO anon;

-- Public Map / Booths: Read active locations and booths (filtered by public RLS)
GRANT SELECT ON TABLE public.locations TO anon;
GRANT SELECT ON TABLE public.booths TO anon;

-- NOTE: The `anon` role is granted NO PRIVILEGES on:
--   - admin_users
--   - moderation_history
--   - audit_log
--   - system_events
--   - storage_snapshots
--   - app_settings
--   - get_current_admin_role() function

-- -------------------------------------------------------
-- 3. AUTHENTICATED ROLE (authenticated) — Logged-In Users
-- Granular table access matching RLS policy capabilities.
-- -------------------------------------------------------

-- Photos: Read all / update status & metadata / delete (RLS gates per role)
GRANT SELECT, UPDATE, DELETE ON TABLE public.photos TO authenticated;

-- Locations & Booths: Management access (RLS gates per role)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.locations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.booths TO authenticated;

-- Admin Users: Self profile read & Super Admin CRUD (RLS gates per role)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.admin_users TO authenticated;

-- Moderation History: Read-only (RLS gates per role; INSERT is server-side only)
GRANT SELECT ON TABLE public.moderation_history TO authenticated;

-- Audit Logs, System Events, Storage Snapshots: Read-only for admins (RLS gates per role; INSERT is server-side only)
GRANT SELECT ON TABLE public.audit_log TO authenticated;
GRANT SELECT ON TABLE public.system_events TO authenticated;
GRANT SELECT ON TABLE public.storage_snapshots TO authenticated;

-- App Settings: Read for all admins, Super Admin write (RLS gates per role)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.app_settings TO authenticated;

-- Helper function execution (required by authenticated RLS policies)
GRANT EXECUTE ON FUNCTION public.get_current_admin_role() TO authenticated;
