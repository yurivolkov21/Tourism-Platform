/**
 * Maps a Supabase `AuthError` (or any unknown failure) to a short, friendly English message.
 * Matches on the error `code` first (stable) then the message text (fallback), since Supabase has
 * tightened codes over versions.
 */
export function authErrorMessage(error: unknown): string {
  const code = (error as { code?: string } | null)?.code ?? '';
  const message = error instanceof Error ? error.message : '';
  const hay = `${code} ${message}`.toLowerCase();

  if (hay.includes('invalid_credentials') || hay.includes('invalid login')) {
    return 'Incorrect email or password.';
  }
  if (hay.includes('email_not_confirmed') || hay.includes('not confirmed')) {
    return 'Please confirm your email before signing in.';
  }
  if (
    hay.includes('user_already_exists') ||
    hay.includes('already registered')
  ) {
    return 'That email is already registered.';
  }
  // New password equals the current one — Supabase's message ("New password
  // should be different from the old password") contains "password should be",
  // so this MUST be matched before any weak-password check.
  if (hay.includes('same_password') || hay.includes('different from the old')) {
    return 'Your new password must be different from your current password.';
  }
  if (hay.includes('weak_password')) {
    // Surface Supabase's own reason (it states the real requirement) rather than
    // a hardcoded length that can drift from the configured policy.
    return message || 'Password is too weak — please choose a stronger one.';
  }
  if (hay.includes('rate') && hay.includes('limit')) {
    return 'Too many attempts — please wait a moment and try again.';
  }
  return message || 'Something went wrong. Please try again.';
}

export default authErrorMessage;
