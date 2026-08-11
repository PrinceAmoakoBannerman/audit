/**
 * Small, dependency-free formatting helpers used across the UI and the
 * report generator, so number/text formatting stays consistent everywhere.
 */

/** Format a fraction as a percentage string with one decimal place, e.g. "42.3%". */
export function formatPercentage(value: number): string {
  if (!Number.isFinite(value)) return '0.0%';
  return `${value.toFixed(1)}%`;
}

/** Normalize a header/status string for comparison: lowercase, trimmed, single spaces. */
export function normalizeText(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/\u00a0/g, ' ') // non-breaking spaces from Excel
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/** Title-case a status string for display, e.g. "outstanding" -> "Outstanding". */
export function titleCase(value: string): string {
  return value
    .split(' ')
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

/** Format a JS Date or Excel date-ish value into a readable string, or '-' if empty. */
export function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) {
    return value.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  const str = String(value).trim();
  return str;
}

/** Slugify a string into a safe file-name fragment. */
export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/** Generate a reasonably unique id without pulling in a uuid dependency. */
export function makeId(prefix = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Human file size, e.g. "1.4 MB". */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let size = bytes / 1024;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}
