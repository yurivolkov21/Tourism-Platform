const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const RELATIVE_CUTOFF_DAYS = 30;

/**
 * Human "time ago" for a timestamp — "just now" / "5 min ago" / "3 hours ago" / "2 days ago". Past
 * ~30 days it falls back to an absolute date. `now` is injectable for deterministic tests. Returns
 * an empty string for an unparseable input.
 */
export function formatRelativeTime(
  iso: string,
  now: Date = new Date(),
): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return '';

  const sec = Math.round((now.getTime() - then.getTime()) / 1000);
  if (sec < 45) return 'just now';

  const min = Math.round(sec / MINUTE);
  if (min < 60) return `${min} min ago`;

  const hr = Math.round(sec / HOUR);
  if (hr < 24) return `${hr} ${hr === 1 ? 'hour' : 'hours'} ago`;

  const day = Math.round(sec / DAY);
  if (day <= RELATIVE_CUTOFF_DAYS)
    return `${day} ${day === 1 ? 'day' : 'days'} ago`;

  return then.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
