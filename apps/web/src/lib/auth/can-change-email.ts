/**
 * Email change is allowed ONLY for password-only accounts: the account signs in
 * with email/password and has NO OAuth provider linked. A Google-linked account
 * (Google-only, or password + Google auto-linked on one email) is blocked —
 * changing the app's email would leave the Google identity's email mismatched,
 * and a Google-only account's email is managed by Google, not us.
 *
 * `providers` is the Supabase `app_metadata.providers` list (see `readProviders`
 * in the account settings page). Empty ⇒ `false` (conservative — block when the
 * provider set is unknown rather than risk an inconsistent change).
 */
export function canChangeEmail(providers: readonly string[]): boolean {
  return providers.includes('email') && providers.every((p) => p === 'email');
}
