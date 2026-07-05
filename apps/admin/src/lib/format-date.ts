/**
 * Short display date for admin tables (`5 Jul 2026`), with a `—` fallback for
 * missing/unparsable input — the one formatter shared by outbox, media garbage,
 * and subscribers views (was copy-pasted per file).
 */
export function formatShortDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
