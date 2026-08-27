import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import type { AuthSession } from '@supabase/supabase-js';
import { mapAuthError, type AuthErrorKey } from './auth';
import { appRedirectUrl, oauthRedirectPath } from './deep-link';
import { supabase } from './supabase';

// Standard Expo AuthSession cleanup call — near-zero cost on native, relevant
// if this app is ever run via `expo start --web` (an app.json `web` block exists).
WebBrowser.maybeCompleteAuthSession();

export type GoogleSignInResult =
  | { error?: undefined; session: AuthSession }
  | { error: AuthErrorKey | 'cancelled' };

export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  // Slash-count normalization lives in `appRedirectUrl` — see the note there.
  const redirectTo = appRedirectUrl(oauthRedirectPath);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error || !data?.url) return { error: mapAuthError(error) };

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return { error: 'cancelled' }; // user closed the browser

  // This project's Supabase client resolves the implicit flow — tokens land
  // in the URL FRAGMENT (`#access_token=...&refresh_token=...`), which
  // `Linking.parse`/`URL.searchParams` never read (they only see the query
  // string). Try that first; fall back to a PKCE `?code=` exchange in case
  // the flow type ever changes server-side.
  const fragment = result.url.split('#')[1];
  if (fragment) {
    const fragmentParams = new URLSearchParams(fragment);
    const accessToken = fragmentParams.get('access_token');
    const refreshToken = fragmentParams.get('refresh_token');
    if (accessToken && refreshToken) {
      const { data: sessionData, error: setError } =
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
      if (setError || !sessionData.session) {
        return { error: mapAuthError(setError) };
      }
      return { session: sessionData.session };
    }
  }

  const { queryParams } = Linking.parse(result.url);
  const code = queryParams?.['code'];
  const codeStr = Array.isArray(code) ? code[0] : code; // queryParams values can be string | string[]
  if (!codeStr) return { error: 'generic' };

  const { data: exchangeData, error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(codeStr);
  if (exchangeError || !exchangeData.session) {
    return { error: mapAuthError(exchangeError) };
  }
  return { session: exchangeData.session };
}

/**
 * Adds Google as a sign-in method for the account already signed in — the
 * common direction, since most people register with an email and password and
 * then want the one-tap login afterwards.
 *
 * Unlike `signInWithGoogle`, the outcome lands SERVER-SIDE: Supabase attaches
 * the identity to the current user, so there is no session in the redirect to
 * adopt. The caller re-reads the JWT afterwards to see the new provider list.
 * Requires "Manual linking" enabled on the Supabase project — the same setting
 * unlinking needs.
 */
export async function linkGoogleIdentity(): Promise<{
  error?: AuthErrorKey | 'cancelled';
}> {
  const redirectTo = appRedirectUrl(oauthRedirectPath);

  const { data, error } = await supabase.auth.linkIdentity({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error || !data?.url) return { error: mapAuthError(error) };

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return { error: 'cancelled' };

  // Supabase reports a refused link (e.g. the Google account already belongs to
  // someone else) in the redirect URL, not as a thrown error — a browser that
  // "succeeded" is not the same as a link that landed.
  const params = new URLSearchParams(
    [result.url.split('?')[1]?.split('#')[0], result.url.split('#')[1]]
      .filter(Boolean)
      .join('&'),
  );
  const failure = params.get('error_code') ?? params.get('error');
  if (failure) return { error: mapAuthError({ code: failure }) };

  return {};
}
