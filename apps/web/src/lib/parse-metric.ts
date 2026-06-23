/**
 * Parsed form of a display metric string (e.g. `"12,000+"`, `"$2M"`, `"4.9"`).
 *
 * Lets a count-up ticker animate the numeric part while preserving any prefix/suffix, without
 * restructuring the (string-typed) i18n catalogue. Non-numeric or ambiguous values
 * (`"24/7"`, `"Local experts"`) come back with `animate: false` so callers render `raw` as-is.
 */
export interface ParsedMetric {
  prefix: string;
  value: number;
  suffix: string;
  decimals: number;
  /** `false` → not a clean single number; render `raw` and skip the count animation. */
  animate: boolean;
  raw: string;
}

const passthrough = (raw: string): ParsedMetric => ({
  prefix: '',
  value: 0,
  suffix: '',
  decimals: 0,
  animate: false,
  raw,
});

// optional non-numeric prefix · a number (commas + optional decimal) · optional trailing remainder
const METRIC_RE = /^([^\d.-]*)([\d,]+(?:\.\d+)?)(.*)$/;

export function parseMetric(input: string): ParsedMetric {
  const raw = input.trim();
  const match = raw.match(METRIC_RE);
  if (!match) return passthrough(raw);

  const [, prefix, numStr, suffix] = match;

  // A suffix that still contains a digit (e.g. "24/7") means this isn't a single clean metric.
  if (/\d/.test(suffix)) return passthrough(raw);

  const cleaned = numStr.replace(/,/g, '');
  const value = Number.parseFloat(cleaned);
  if (!Number.isFinite(value)) return passthrough(raw);

  const dot = cleaned.indexOf('.');
  const decimals = dot === -1 ? 0 : cleaned.length - dot - 1;

  return { prefix, value, suffix, decimals, animate: true, raw };
}

export default parseMetric;
