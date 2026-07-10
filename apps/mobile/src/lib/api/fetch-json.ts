import { getApiBaseUrl } from './client';

const MAX_ATTEMPTS = 5;
const RETRY_DELAY_MS = 4000;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Plain GET with retries for Render cold starts. Platform layer only. */
export async function fetchJsonWithRetry<T>(
  path: string,
  label: string,
): Promise<T> {
  const url = `${getApiBaseUrl()}${path}`;

  if (__DEV__) {
    console.log(`[${label}] fetching`, url);
  }

  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        throw new Error(`${label} ${response.status}: ${response.statusText}`);
      }
      return (await response.json()) as T;
    } catch (error) {
      lastError = error;
      if (__DEV__) {
        console.warn(
          `[${label}] attempt ${attempt + 1}/${MAX_ATTEMPTS} failed:`,
          error,
        );
      }
      if (attempt < MAX_ATTEMPTS - 1) {
        await sleep(RETRY_DELAY_MS * (attempt + 1));
      }
    }
  }
  throw lastError;
}
