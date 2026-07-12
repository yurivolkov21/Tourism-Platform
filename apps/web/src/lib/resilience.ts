// Turns fetch outcomes into an honest tri-state so an API outage never renders
// as a real "no results". Consumed by data-fed pages (tours/destinations/blog).

export type Settled<T> = { ok: true; data: T } | { ok: false; data: null };

/** Awaits `promise`, returning a tagged result instead of throwing. */
export async function settle<T>(promise: Promise<T>): Promise<Settled<T>> {
  try {
    return { ok: true, data: await promise };
  } catch {
    return { ok: false, data: null };
  }
}

export type ContentState = 'error' | 'empty' | 'content';

/**
 * Picks which state a data-fed section renders. `failed` wins over `isEmpty`,
 * so an outage is never mistaken for a genuine empty result.
 */
export function contentState({
  failed,
  isEmpty,
}: {
  failed: boolean;
  isEmpty: boolean;
}): ContentState {
  if (failed) return 'error';
  return isEmpty ? 'empty' : 'content';
}
