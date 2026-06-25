function hasControlChar(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    if (s.charCodeAt(i) < 0x20) return true;
  }
  return false;
}

/**
 * Returns `path` only when it's a safe **local** path (a single leading slash, no scheme, no
 * protocol-relative `//`, no backslashes, no control chars). Otherwise returns `fallback`.
 * Guards the `?redirect=` param against open-redirect attacks.
 */
export function safeRedirect(path: string | null | undefined, fallback = '/'): string {
  if (typeof path !== 'string' || path.length === 0) return fallback;
  if (!path.startsWith('/')) return fallback; // must be an absolute local path
  if (path.startsWith('//')) return fallback; // protocol-relative → external
  if (path.includes('\\')) return fallback; // backslash tricks
  if (hasControlChar(path)) return fallback; // newlines / control chars
  return path;
}

export default safeRedirect;
