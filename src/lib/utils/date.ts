/**
 * Deterministic date formatting utility for SSR-compatible rendering.
 *
 * Avoids React hydration mismatches caused by server vs client locale
 * differences when using toLocaleDateString().
 */

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const MONTHS_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * Formats an ISO date string into a deterministic "Mon D" string (e.g. "Aug 26").
 */
export function formatPhotoDate(isoString: string): string {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "";
  const month = MONTHS_SHORT[d.getUTCMonth()];
  const day = d.getUTCDate();
  return `${month} ${day}`;
}

/**
 * Formats an ISO date string into a deterministic "Month D, YYYY" string (e.g. "August 26, 2026").
 */
export function formatPhotoDateFull(isoString: string): string {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "";
  const month = MONTHS_FULL[d.getUTCMonth()];
  const day = d.getUTCDate();
  const year = d.getUTCFullYear();
  return `${month} ${day}, ${year}`;
}
