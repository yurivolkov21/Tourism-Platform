/**
 * Flash-message plumbing for toasts fired after a redirect-based Server Action (create/update).
 * The action redirects with `?flash=<key>`; the client `<FlashToaster>` reads the key, fires the
 * mapped toast, and strips the param. Pure module — safe to import from both server and client.
 */

export type FlashType = 'success' | 'error' | 'info';

export interface FlashMessage {
  type: FlashType;
  text: string;
}

const FLASH_MESSAGES: Record<string, FlashMessage> = {
  created: { type: 'success', text: 'Created successfully.' },
  updated: { type: 'success', text: 'Changes saved.' },
};

/** Resolve a `?flash=` key to its toast message, or null for a missing/unknown key. */
export function resolveFlash(key: string | null | undefined): FlashMessage | null {
  if (!key) return null;
  return FLASH_MESSAGES[key] ?? null;
}

/** Append a `flash` query key to a redirect path, preserving any existing query string. */
export function flashPath(path: string, key: string): string {
  const [base, query = ''] = path.split('?');
  const params = new URLSearchParams(query);
  params.set('flash', key);
  return `${base}?${params.toString()}`;
}
