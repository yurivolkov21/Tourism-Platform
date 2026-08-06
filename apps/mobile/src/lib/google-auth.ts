import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import type { AuthSession } from '@supabase/supabase-js';
import { mapAuthError, type AuthErrorKey } from './auth';
import { supabase } from './supabase';

// Standard Expo AuthSession cleanup call — near-zero cost on native, relevant
// if this app is ever run via `expo start --web` (an app.json `web` block exists).
WebBrowser.maybeCompleteAuthSession();

export type GoogleSignInResult =
  | { error?: undefined; session: AuthSession }
  | { error: AuthErrorKey | 'cancelled' };

export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  // expo-linking's `isTripleSlashed: false` option is unreliable on EAS-distributed
  // dev-client builds — it treats the build as "Expo-hosted" and produces a
  // triple slash (`scheme:///path`) regardless. Normalize to the double-slash
  // form (`scheme://path`) that matches the exact entry allowed in Supabase's
  // Redirect URLs — a mismatched slash count fails Supabase's exact match.
  const redirectTo = Linking.createURL('/auth/callback').replace(
    /^([a-zA-Z0-9+.-]+):\/\/\//,
    '$1://',
  );

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
