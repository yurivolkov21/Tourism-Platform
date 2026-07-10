import Constants from 'expo-constants';
import { createApiClient, type ApiClient } from '@tourism/core';
import { PRODUCTION_API_BASE_URL } from './constants';

type TokenGetter = () => string | null | undefined | Promise<string | null | undefined>;

let tokenGetter: TokenGetter | undefined;

/**
 * Optional hook for a future auth layer (no login UI in P5 yet).
 * When unset, owner-scoped routes like `/bookings/me` return empty.
 */
export function setApiTokenGetter(getter: TokenGetter | undefined): void {
  tokenGetter = getter;
}

export async function getApiAccessToken(): Promise<string | null> {
  const token = tokenGetter ? await tokenGetter() : null;
  return token ?? null;
}

/** API origin (no `/api/v1`) — same value as web `NEXT_PUBLIC_API_BASE_URL`. */
export function getApiBaseUrl(): string {
  const fromExtra = Constants.expoConfig?.extra?.apiBaseUrl;
  if (typeof fromExtra === 'string' && fromExtra.trim().length > 0) {
    return fromExtra.trim().replace(/\/$/, '');
  }
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (typeof fromEnv === 'string' && fromEnv.trim().length > 0) {
    return fromEnv.trim().replace(/\/$/, '');
  }
  return PRODUCTION_API_BASE_URL;
}

export function getApiClient(): ApiClient {
  return createApiClient({
    baseUrl: getApiBaseUrl(),
    getToken: getApiAccessToken,
  });
}
