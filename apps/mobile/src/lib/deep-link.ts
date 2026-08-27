import { useEffect, useState } from 'react';
import * as Linking from 'expo-linking';

/**
 * Builds a deep link into the app for Supabase to redirect back to.
 *
 * expo-linking's `isTripleSlashed: false` option is unreliable on
 * EAS-distributed dev-client builds — it treats the build as "Expo-hosted" and
 * produces a triple slash (`scheme:///path`) regardless. Supabase matches its
 * Redirect URLs allow-list EXACTLY, so a mismatched slash count fails; the URL
 * is normalized to the double-slash form (`scheme://path`) that the allow-list
 * entry is written in.
 */
export function appRedirectUrl(path: string): string {
  return Linking.createURL(path).replace(/^([a-zA-Z0-9+.-]+):\/\/\//, '$1://');
}

/** Where a Supabase OAuth sign-in comes back to. */
export const oauthRedirectPath = '/auth/callback';

/** Where a Supabase password-recovery email comes back to. */
export const resetRedirectPath = '/auth/reset';

// ── Incoming deep links ──────────────────────────────────────────────────────
//
// `Linking.useURL()` cannot be used from the destination screen. When the app is
// ALREADY RUNNING, the OS delivers the link, expo-router navigates, and only
// then does the screen mount — by which time the `url` event has been and gone,
// and `getInitialURL()` is null because the link did not launch the app. The
// screen therefore saw nothing at all and waited forever.
//
// So the recording starts at module scope (imported from the root layout, i.e.
// before any route exists) and the latest URL is remembered for whoever mounts
// later. Same idiom as the AppState listener in `supabase.ts`.

let lastUrl: string | null = null;
const subscribers = new Set<(url: string) => void>();

function record(url: string | null): void {
  if (!url) return;
  lastUrl = url;
  for (const notify of subscribers) notify(url);
}

// Guarded: this runs at import time, so a runtime (or a test double) without
// the Linking API must not take the whole module down with it — every other
// export here is pure.
if (typeof Linking.addEventListener === 'function') {
  Linking.addEventListener('url', ({ url }) => record(url));
}
if (typeof Linking.getInitialURL === 'function') {
  // Cold start: the link that launched the app is only available here.
  void Linking.getInitialURL().then(record);
}

/**
 * The most recent deep link the app received, whenever it arrived — including
 * before this component existed. `null` until one shows up.
 */
export function useIncomingLink(): string | null {
  const [url, setUrl] = useState<string | null>(lastUrl);
  useEffect(() => {
    // Re-read on mount: one may have landed between render and effect.
    setUrl(lastUrl);
    subscribers.add(setUrl);
    return () => {
      subscribers.delete(setUrl);
    };
  }, []);
  return url;
}

/** Test seam — drops the remembered link so cases can't bleed into each other. */
export function __resetIncomingLink(): void {
  lastUrl = null;
  subscribers.clear();
}
