-- ============================================================
-- TechnoVIT Fine Arts Club — Photo Gallery
-- Migration 00004: Moderation & Service-Role Table Privileges
--
-- Grants the minimum required PostgreSQL table privileges to
-- service_role (for server-side moderation and audit logging)
-- and to authenticated (for moderator/admin frontend sessions).
--
-- Row Level Security (RLS) policies continue to enforce row-level
-- isolation on authenticated user requests.
--
-- IMPORTANT: DO NOT EXECUTE until explicitly approved.
-- ============================================================

-- -------------------------------------------------------
-- 1. SERVICE ROLE (service_role) — Server-Side Moderation & Audit Logging
-- -------------------------------------------------------

-- Admin Users: Server-side validation of active admin profiles and roles
GRANT SELECT ON TABLE public.admin_users TO service_role;

-- Moderation History: Server-side logging of photo approvals and rejections
GRANT SELECT, INSERT ON TABLE public.moderation_history TO service_role;

-- Audit Log: Server-side recording of administrative events
GRANT SELECT, INSERT ON TABLE public.audit_log TO service_role;

-- -------------------------------------------------------
-- 2. AUTHENTICATED ROLE (authenticated) — Moderator & Admin Frontend Sessions
-- Base table privileges required for PostgREST queries governed by RLS.
-- -------------------------------------------------------

-- Admin Users: Read own profile (governed by admin_users_self_select RLS)
GRANT SELECT ON TABLE public.admin_users TO authenticated;

-- Moderation History: Read-only for active moderators/admins (governed by RLS)
GRANT SELECT ON TABLE public.moderation_history TO authenticated;

-- Audit Log: Read-only for admins (governed by audit_log_admin_select RLS)
GRANT SELECT ON TABLE public.audit_log TO authenticated;

-- Helper function execution for authenticated RLS policies
GRANT EXECUTE ON FUNCTION public.get_current_admin_role() TO authenticated;
