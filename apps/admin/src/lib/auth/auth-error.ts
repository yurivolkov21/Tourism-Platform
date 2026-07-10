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
  if (hay.includes('rate') && hay.includes('limit')) {
    return 'Too many attempts — please wait a moment and try again.';
  }
  return message || 'Something went wrong. Please try again.';
}

export default authErrorMessage;
