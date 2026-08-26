-- ============================================================
-- TechnoVIT Fine Arts Club — Photo Gallery
-- Migration 00005: Super Admin User Management Table Privileges
--
-- Grants INSERT, UPDATE, DELETE privileges on public.admin_users
-- to service_role so that authenticated SUPER_ADMIN users can
-- provision new moderators/administrators, update roles, and
-- activate/deactivate admin accounts server-side.
--
-- IMPORTANT: DO NOT EXECUTE until explicitly approved.
-- ============================================================

GRANT INSERT, UPDATE, DELETE ON TABLE public.admin_users TO service_role;
