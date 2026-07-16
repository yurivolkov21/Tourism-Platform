/**
 * On-demand revalidation helpers for the public tour detail page.
 *
 * The tour detail/reviews reads are tagged with {@link tourTag} so the API can
 * bust them via `revalidateTag` the moment a review is (un)approved, instead of
 * waiting out the 300s ISR timer. Both the fetch-tagging and the revalidation
 * route go through `tourTag` so the string is defined once.
 */

/** Per-tour cache tag, e.g. `tour:ha-long-cruise`. */
export function tourTag(slug: string): string {
  return `tour:${slug}`;
}

/**
 * Constant-time equality for the shared `REVALIDATE_SECRET`. Returns `false`
 * for any empty/nullish value (an unconfigured server must never match) and for
 * a length mismatch, then compares the remaining characters without an
 * early-exit so a wrong secret can't be timed character-by-character. Pure (no
 * `node:crypto`) so it stays trivially testable and bundler-agnostic.
 */
export function isValidRevalidateSecret(
  provided: string | null | undefined,
  expected: string | null | undefined,
): boolean {
  if (!provided || !expected) return false;
  if (provided.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i += 1) {
    mismatch |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}
