/** Validates an http(s) origin once at startup — fails loud instead of silent fetch errors. */
export function requireHttpOrigin(
  name: string,
  raw: string | undefined,
): string {
  const value = raw?.trim().replace(/\/+$/, '');
  if (!value || !/^https?:\/\/.+/.test(value)) {
    throw new Error(
      `${name} is missing or not an http(s) origin — set it in apps/mobile/.env`,
    );
  }
  return value;
}

/** Validates a non-empty env value. */
export function requireValue(name: string, raw: string | undefined): string {
  const value = raw?.trim();
  if (!value) {
    throw new Error(`${name} is missing — set it in apps/mobile/.env`);
  }
  return value;
}

/** Back-compat alias used by W1 tests/docs. */
export function resolveApiBaseUrl(raw: string | undefined): string {
  return requireHttpOrigin('EXPO_PUBLIC_API_BASE_URL', raw);
}

// Evaluated at import time. Under jest this only works because Nx auto-loads
// apps/mobile/.env into process.env (NX_LOAD_DOT_ENV_FILES) — run tests through nx.
export const API_BASE_URL = resolveApiBaseUrl(
  process.env.EXPO_PUBLIC_API_BASE_URL,
);
export const SUPABASE_URL = requireHttpOrigin(
  'EXPO_PUBLIC_SUPABASE_URL',
  process.env.EXPO_PUBLIC_SUPABASE_URL,
);
export const SUPABASE_ANON_KEY = requireValue(
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
);
export const WEB_URL = requireHttpOrigin(
  'EXPO_PUBLIC_WEB_URL',
  process.env.EXPO_PUBLIC_WEB_URL,
);
