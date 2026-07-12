const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Narrows a raw `?from=`/`?to=` search-param value to a strict `YYYY-MM-DD` string that is
 * also a real calendar date (rejects `2026-13-01`, `2026-02-30`, etc. via a UTC round-trip).
 * Arrays (repeated query keys) and undefined both fall through to undefined.
 */
export function parseDateParam(
  v: string | string[] | undefined,
): string | undefined {
  if (typeof v !== 'string' || !DATE_ONLY.test(v)) return undefined;
  const [y, m, d] = v.split('-').map(Number);
  const asUtc = new Date(Date.UTC(y, m - 1, d));
  const roundTrips =
    asUtc.getUTCFullYear() === y &&
    asUtc.getUTCMonth() === m - 1 &&
    asUtc.getUTCDate() === d;
  return roundTrips ? v : undefined;
}

export type RangePreset = '7d' | '30d' | '90d' | 'month' | 'all';

const PRESETS: RangePreset[] = ['7d', '30d', '90d', 'month', 'all'];

/** `YYYY-MM-DD` from a Date's LOCAL calendar fields (never `toISOString`, which can shift the day). */
function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** A new local-midnight Date offset by `days` (may be negative) from `d`'s calendar date. */
function addDays(d: Date, days: number): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  copy.setDate(copy.getDate() + days);
  return copy;
}

/**
 * `{ from, to }` for a preset, computed from `today`'s LOCAL calendar date (the admin picks
 * ranges in their own timezone) as `YYYY-MM-DD` strings. `'all'` returns no bounds — the BE
 * treats missing params as all-time.
 */
export function presetRange(
  preset: RangePreset,
  today: Date,
): { from?: string; to?: string } {
  switch (preset) {
    case '7d':
      return { from: toDateStr(addDays(today, -6)), to: toDateStr(today) };
    case '30d':
      return { from: toDateStr(addDays(today, -29)), to: toDateStr(today) };
    case '90d':
      return { from: toDateStr(addDays(today, -89)), to: toDateStr(today) };
    case 'month':
      return {
        from: toDateStr(new Date(today.getFullYear(), today.getMonth(), 1)),
        to: toDateStr(today),
      };
    case 'all':
      return {};
  }
}

/**
 * Which preset (if any) the current `?from&to` pair matches, given `today`. No bounds at all
 * is `'all'`; an exact match of a preset's computed range is that preset; anything else
 * (including only one bound set) is `'custom'`.
 */
export function matchPreset(
  from: string | undefined,
  to: string | undefined,
  today: Date,
): RangePreset | 'custom' {
  for (const preset of PRESETS) {
    const range = presetRange(preset, today);
    if (range.from === from && range.to === to) return preset;
  }
  return 'custom';
}
