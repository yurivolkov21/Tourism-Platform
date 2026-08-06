import { useEffect } from 'react';
import { router } from 'expo-router';

/**
 * OS-level deep-link landing pad for `tourism-mobile://auth/callback`. The
 * actual code exchange happens inside `signInWithGoogle()`'s own
 * `WebBrowser.openAuthSessionAsync` promise (lib/google-auth.ts) — Android
 * ALSO delivers the same redirect Intent to expo-router's linking config,
 * which would otherwise show "Unmatched Route" since no screen owns this
 * path. This screen just swallows that duplicate delivery.
 */
export default function AuthCallbackScreen() {
  useEffect(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, []);
  return null;
}
