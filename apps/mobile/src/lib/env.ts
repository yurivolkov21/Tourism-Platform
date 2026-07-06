/** Validates the API origin once at startup — fails loud instead of silent fetch errors. */
export function resolveApiBaseUrl(raw: string | undefined): string {
  const value = raw?.trim().replace(/\/+$/, '');
  if (!value || !/^https?:\/\/.+/.test(value)) {
    throw new Error(
      'EXPO_PUBLIC_API_BASE_URL is missing or not an http(s) origin — set it in apps/mobile/.env',
    );
  }
  return value;
}

export const API_BASE_URL = resolveApiBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL);
