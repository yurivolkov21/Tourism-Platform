import { createApiClient } from '@tourism/core';

// API origin only — paths in the schema already include the /api/v1 prefix.
const apiBaseUrl = process.env['EXPO_PUBLIC_API_BASE_URL'] ?? 'http://localhost:3000';

export async function syncUser(accessToken: string): Promise<void> {
  const client = createApiClient({
    baseUrl: apiBaseUrl,
    getToken: () => Promise.resolve(accessToken),
  });
  await client.POST('/api/v1/auth/sync', { body: {} });
}
