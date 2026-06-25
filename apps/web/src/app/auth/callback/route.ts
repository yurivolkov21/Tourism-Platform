import { NextResponse, type NextRequest } from 'next/server';

import { safeRedirect } from '../../../lib/auth/safe-redirect';
import { syncUser } from '../../../lib/auth/sync-user';
import { createClient } from '../../../lib/supabase/server';

/**
 * Email-confirmation callback. Supabase redirects here with a `code`; we exchange it for a session
 * (sets the session cookies), mirror the user via `/auth/sync`, then redirect into the app. On any
 * failure, bounce to `/login?error=auth`.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const next = safeRedirect(searchParams.get('redirect'), '/account');

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      await syncUser();
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
