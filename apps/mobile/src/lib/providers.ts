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

/** Read Google's profile photo off the Supabase user's `user_metadata` (`avatar_url` or `picture`). */
export function readGoogleAvatarUrl(
  userMetadata: Record<string, unknown> | undefined,
): string | null {
  const avatarUrl = userMetadata?.['avatar_url'];
  if (typeof avatarUrl === 'string') return avatarUrl;
  const picture = userMetadata?.['picture'];
  return typeof picture === 'string' ? picture : null;
}
