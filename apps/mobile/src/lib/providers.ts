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

/**
 * Email change is allowed ONLY for password-only accounts: signs in with
 * email/password and has NO OAuth provider linked. A Google-linked account is
 * blocked — changing the app's email would leave the Google identity's email
 * mismatched, and a Google-only account's email is managed by Google. Empty ⇒
 * false (block when the provider set is unknown). Mirrors the web rule in
 * `apps/web/src/lib/auth/can-change-email.ts`.
 */
export function canChangeEmail(providers: readonly string[]): boolean {
  return providers.includes('email') && providers.every((p) => p === 'email');
}
