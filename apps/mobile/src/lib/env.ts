import Constants from 'expo-constants';

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

/**
 * Derives the local API origin from the host Metro's dev server is bound to
 * (`Constants.expoConfig.hostUri`, e.g. "192.168.20.48:8081") — the same LAN
 * IP `start-dev.ps1` already re-detects on every launch, so a network change
 * no longer means hand-editing `.env`. Only the host is reused; the port is
 * always the API's own (3000), never Metro's.
 *
 * Returns undefined — falling through to the explicit env var, or the
 * "missing" error if there truly isn't one — when there's no dev server
 * (production/standalone builds) or the host isn't a real IP (tunnel mode's
 * `*.exp.direct`, which the API was never listening on anyway).
 */
export function deriveApiOriginFromHostUri(
  hostUri: string | undefined,
  apiPort: number,
): string | undefined {
  const host = hostUri?.split(':')[0]?.trim();
  if (!host || !/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return undefined;
  return `http://${host}:${apiPort}`;
}

const LOCAL_API_PORT = 3000;

// Evaluated at import time. Under jest this only works because Nx auto-loads
// apps/mobile/.env into process.env (NX_LOAD_DOT_ENV_FILES) — run tests through nx.
//
// DERIVED WINS, not the other way round: a real Metro session (Constants.
// expoConfig.hostUri is only set while running through the dev server) always
// knows the CURRENT LAN IP, while `.env`'s value can only ever be whatever was
// true the last time someone typed it in — exactly the staleness this exists
// to kill. `.env`'s EXPO_PUBLIC_API_BASE_URL is the fallback for contexts with
// no dev server at all: jest/CI (no hostUri, ever) and production/EAS builds,
// where it must be set to something real (e.g. the deployed Render URL).
export const API_BASE_URL = resolveApiBaseUrl(
  deriveApiOriginFromHostUri(Constants.expoConfig?.hostUri, LOCAL_API_PORT) ||
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
