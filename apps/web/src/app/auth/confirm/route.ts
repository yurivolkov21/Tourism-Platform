import { NextResponse, type NextRequest } from 'next/server';

import { parseConfirmParams } from '../../../lib/auth/confirm-params';
import { safeRedirect } from '../../../lib/auth/safe-redirect';
import { syncUser } from '../../../lib/auth/sync-user';
import { createClient } from '../../../lib/supabase/server';

export const runtime = 'nodejs';

/**
 * Token-hash email confirmation — signup · recovery · email_change · invite.
 *
 * Unlike `/auth/callback` (PKCE `exchangeCodeForSession`, kept for OAuth),
 * `verifyOtp({ type, token_hash })` validates the self-contained hash server-side,
 * so confirmation completes even when the email link is opened in a **different
 * browser / mail-client** than the one that started the flow (the PKCE code
 * verifier lives only in the origin browser). This is the fix for the stuck
 * secure-email-change confirmation.
 *
 * On success we call `syncUser()` (`POST /auth/sync`) so the API's mirrored
 * `User.email` reflects the change immediately — the upsert already writes the
 * email from the JWT, so one trigger refreshes it (no sign-out/in). Then redirect
 * to the safe `redirect` target with the token stripped from the URL. Any failure
 * (bad/absent params, verifyOtp error) bounces to `/login?error=auth`.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const params = parseConfirmParams(searchParams);
  const next = safeRedirect(searchParams.get('redirect'), '/account');

  if (params) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type: params.type,
      token_hash: params.tokenHash,
    });
    if (!error) {
      await syncUser();
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
