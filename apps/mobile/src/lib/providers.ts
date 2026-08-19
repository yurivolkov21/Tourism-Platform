/** Read the linked sign-in providers from the Supabase user's `app_metadata` (Google, email/password, …). */
export function readProviders(
  appMetadata: Record<string, unknown> | undefined,
): string[] {
  const list = appMetadata?.['providers'];
  if (Array.isArray(list))
    return list.filter((p): p is string => typeof p === 'string');
  const single = appMetadata?.['provider'];
  return typeof single === 'string' ? [single] : [];
}
