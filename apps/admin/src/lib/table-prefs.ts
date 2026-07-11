import type { VisibilityState } from '@tanstack/react-table';

/**
 * Column-visibility persistence for the admin tables (the "Columns" menu).
 * Pure codec — the localStorage side lives in `usePersistentColumnVisibility`.
 * Keys are namespaced + versioned so a future shape change can bump `v1` and
 * silently orphan stale entries instead of tripping over them.
 */
export function columnPrefsKey(tableId: string): string {
  return `tourism-admin.columns.v1.${tableId}`;
}

/**
 * Strict parse of a stored visibility payload: a JSON object with only boolean
 * values. Anything else (bad JSON, arrays, primitives, mixed values — e.g. a
 * hand-edited or stale entry) → `null`, so callers fall back to the defaults.
 */
export function parseStoredVisibility(
  raw: string | null,
): VisibilityState | null {
  if (raw === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return null;
  }
  const entries = Object.entries(parsed as Record<string, unknown>);
  if (entries.some(([, value]) => typeof value !== 'boolean')) return null;
  return parsed as VisibilityState;
}
