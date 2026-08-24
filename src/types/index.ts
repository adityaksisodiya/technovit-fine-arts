/* ============================================================
   TechnoVIT Fine Arts Club — Shared TypeScript Types
   
   Core type definitions used across the application.
   This file grows as features are added in later phases.
   ============================================================ */

/**
 * Photo status lifecycle.
 * Only APPROVED photos are returned by public gallery queries.
 */
export enum PhotoStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  DELETED = 'deleted',
}

/**
 * Administrator role hierarchy.
 * SUPER_ADMIN > ADMIN > MODERATOR
 */
export enum AdminRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
}

/**
 * System event severity levels for monitoring.
 */
export enum EventSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * Booth types for the location/booth system.
 */
export enum BoothType {
  PHOTO_BOOTH = 'photo_booth',
  ART_STATION = 'art_station',
  STAGE = 'stage',
}

/**
 * Moderation actions that can be performed on a photo.
 */
export enum ModerationAction {
  APPROVED = 'approved',
  REJECTED = 'rejected',
  DELETED = 'deleted',
  RESTORED = 'restored',
}

/**
 * Audit log entity types.
 */
export enum AuditEntityType {
  PHOTO = 'photo',
  LOCATION = 'location',
  BOOTH = 'booth',
  ADMIN = 'admin',
  SETTING = 'setting',
}
