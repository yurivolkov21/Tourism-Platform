const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Narrows a raw searchParam to a uuid (anything else = ignore the filter) so a
 * hand-edited URL degrades to "no filter" instead of an API 400.
 */
export function parseUuidParam(raw?: string): string | undefined {
  return raw && UUID_RE.test(raw) ? raw : undefined;
}

/** Narrows a raw `?rating=` searchParam to an integer 1-5 (anything else = no filter). */
export function parseRatingParam(raw?: string): number | undefined {
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : undefined;
}
