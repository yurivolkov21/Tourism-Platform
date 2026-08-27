import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ApiRequestError } from '@tourism/core';
import { getApiClient } from './api';
import { mapAuthError, type AuthErrorKey } from './auth';
import { appRedirectUrl, resetRedirectPath } from './deep-link';
import {
  linkGoogleIdentity,
  signInWithGoogle as googleSignIn,
} from './google-auth';
import { readGoogleAvatarUrl, readProviders } from './providers';
import { supabase } from './supabase';

export interface AuthContextValue {
  status: 'loading' | 'signedIn' | 'signedOut';
  user: { id: string; email?: string } | null;
  /** Linked Supabase sign-in methods (`app_metadata.providers`); see `unlinkProvider`. */
  providers: string[];
  /** Google's profile photo from `user_metadata` — display-only fallback until the user uploads their own. */
  googleAvatarUrl: string | null;
  signIn(email: string, password: string): Promise<{ error?: AuthErrorKey }>;
  signUp(
    fullName: string,
    email: string,
    password: string,
  ): Promise<{ error?: AuthErrorKey; confirmationSent?: boolean }>;
  signInWithGoogle(): Promise<{ error?: AuthErrorKey }>;
  sendReset(email: string): Promise<{ error?: AuthErrorKey }>;
  /**
   * Set a new password. Accounts that sign in with a password must re-auth with
   * the current one first — without that, anyone holding an unlocked device
   * could take the account over, and changing the email (the LESS destructive
   * action) already demands it. A Google-only account has no current password
   * to prove, so it passes `undefined` and is setting its first one.
   * On success every OTHER session is revoked, the behaviour users expect from
   * a password change: a stolen session must not outlive it. `field` says which
   * input to blame.
   */
  changePassword(
    password: string,
    currentPassword?: string,
  ): Promise<{ error?: AuthErrorKey; field?: 'currentPassword' }>;
  /**
   * Add an OAuth sign-in method to the account already signed in. This is the
   * direction most people actually take: register with an email and password,
   * then link Google so later logins are one tap. `cancelled` means the user
   * closed the browser — not a failure to report.
   */
  linkProvider(provider: 'google'): Promise<{ error?: AuthErrorKey }>;
  /** Re-mirror the signed-in user into the API DB, surfacing failure to the caller. */
  resyncUser(): Promise<{ error?: true }>;
  /** Deletes the account server-side, then signs out. `error` is a server-provided message when
   * available (e.g. active bookings block deletion), else a generic fallback. */
  deleteAccount(): Promise<{ error?: string }>;
  signOut(): Promise<void>;
  /**
   * Revoke every session for this account (Supabase `scope: 'global'`) — the
   * current device included, so the app lands back on the signed-out state.
   */
  signOutEverywhere(): Promise<{ error?: AuthErrorKey }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Mirror the signed-in user into the API DB (idempotent; the API 401s unsynced
 * users otherwise). Returns whether it landed: a swallowed failure used to leave
 * the account permanently unusable, because nothing ever retried — boot only
 * restores the session, and the per-screen "Retry" buttons refetch without
 * re-syncing. Callers that can act on it now do — boot re-syncs a restored
 * session, and `resyncUser` lets a failed screen retry the mirror, not just the
 * fetch.
 */
async function syncUser(fullName?: string): Promise<boolean> {
  try {
    await getApiClient().POST('/api/v1/auth/sync', {
      body: fullName ? { fullName } : {},
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Proves the caller still knows the account password. Supabase exposes no
 * verify-password API, so signing in again IS the re-auth (it just re-issues a
 * session for the same user). Returns the mapped failure, or `null` when the
 * password checked out.
 *
 * The email half of the pair is the account's own address, so a rejection can
 * only mean the password — reported as `wrongPassword`, not the sign-in
 * screen's ambiguous "email or password is incorrect".
 */
async function reauthenticate(
  email: string | undefined,
  password: string,
): Promise<{ error: AuthErrorKey } | null> {
  // No known address ⇒ nothing to re-auth against. Signing in with '' would
  // reach Supabase and come back as an unrelated validation error.
  if (!email) return { error: 'generic' };
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (!error) return null;
  const mapped = mapAuthError(error);
  return { error: mapped === 'invalidCredentials' ? 'wrongPassword' : mapped };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthContextValue['status']>('loading');
  const [user, setUser] = useState<AuthContextValue['user']>(null);
  const [providers, setProviders] = useState<string[]>([]);
  const [googleAvatarUrl, setGoogleAvatarUrl] = useState<string | null>(null);

  /** Drop everything account-scoped from the cache. Shared by every sign-out path. */
  const clearAccountCaches = useCallback(() => {
    queryClient.removeQueries({ queryKey: ['wishlist'] });
    queryClient.removeQueries({ queryKey: ['profile'] });
    // Bookings are account-scoped PII — never let them survive an account switch.
    queryClient.removeQueries({ queryKey: ['bookings'] });
  }, [queryClient]);

  /**
   * Pulls a fresh JWT and re-reads the identity claims from it.
   *
   * `app_metadata.providers` rides IN the token, so anything that changes the
   * set of linked sign-in methods server-side — unlinking one, or setting a
   * first password, which is what makes Supabase create the `email` identity —
   * is invisible to this app until the token is reissued. Without it the
   * Connected accounts list keeps showing the state from before the change.
   */
  const refreshIdentity = useCallback(async () => {
    const { data } = await supabase.auth.refreshSession();
    if (!data?.session) return;
    setProviders(readProviders(data.session.user.app_metadata));
    setGoogleAvatarUrl(readGoogleAvatarUrl(data.session.user.user_metadata));
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setProviders(readProviders(data.session?.user.app_metadata));
      setGoogleAvatarUrl(readGoogleAvatarUrl(data.session?.user.user_metadata));
      setStatus(data.session ? 'signedIn' : 'signedOut');
      // A restored session may never have been mirrored — if the sync at
      // sign-in time lost the network, nothing else would ever retry it and
      // every authed screen would 401 forever. Idempotent, so it's free.
      if (data.session) {
        void syncUser();
        // The stored token can predate an identity change made elsewhere (the
        // web app, another device). Re-reading it on launch keeps Connected
        // accounts honest instead of showing yesterday's truth until sign-out.
        void refreshIdentity();
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setProviders(readProviders(session?.user.app_metadata));
      setGoogleAvatarUrl(readGoogleAvatarUrl(session?.user.user_metadata));
      setStatus(session ? 'signedIn' : 'signedOut');
      // Sessions also end without anyone pressing "Sign out" — an expired
      // refresh token, or a revocation from another device. The account-scoped
      // caches have to go with them, or the next user to sign in on this device
      // sees the previous one's profile and bookings while the refetch is still
      // in flight.
      if (!session) clearAccountCaches();
    });
    return () => sub.subscription.unsubscribe();
  }, [clearAccountCaches, refreshIdentity]);

  const signIn = useCallback<AuthContextValue['signIn']>(
    async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) return { error: mapAuthError(error) };
      await syncUser();
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      return {};
    },
    [queryClient],
  );

  const signUp = useCallback<AuthContextValue['signUp']>(
    async (fullName, email, password) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) return { error: mapAuthError(error) };
      if (!data.session) return { confirmationSent: true }; // email-confirmation ON
      await syncUser(fullName);
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      return {};
    },
    [queryClient],
  );

  const signInWithGoogle = useCallback<
    AuthContextValue['signInWithGoogle']
  >(async () => {
    const result = await googleSignIn();
    if (result.error) return { error: result.error };
    await syncUser(result.session.user.user_metadata?.['full_name']);
    queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    queryClient.invalidateQueries({ queryKey: ['profile'] });
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
    return {};
  }, [queryClient]);

  const sendReset = useCallback<AuthContextValue['sendReset']>(
    async (email) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        // Without this the link follows the Supabase Site URL to the WEB app,
        // so a phone user had to finish resetting in a browser and come back.
        redirectTo: appRedirectUrl(resetRedirectPath),
      });
      return error ? { error: mapAuthError(error) } : {};
    },
    [],
  );

  const signOut = useCallback(async () => {
    // `scope: 'local'` explicitly — supabase-js defaults signOut to 'global',
    // so the plain Sign out button was silently revoking every session on every
    // device (killing the user's web login too) and leaving "Sign out of all
    // devices" with nothing of its own to do.
    await supabase.auth.signOut({ scope: 'local' });
    clearAccountCaches();
  }, [clearAccountCaches]);

  const signOutEverywhere = useCallback<
    AuthContextValue['signOutEverywhere']
  >(async () => {
    const { error } = await supabase.auth.signOut({ scope: 'global' });
    // Leave the caches alone on failure: the session is still valid, and the
    // screen stays put so the user can retry.
    if (error) return { error: mapAuthError(error) };
    clearAccountCaches();
    return {};
  }, [clearAccountCaches]);

  const changePassword = useCallback<AuthContextValue['changePassword']>(
    async (password, currentPassword) => {
      if (currentPassword !== undefined) {
        const reauth = await reauthenticate(user?.email, currentPassword);
        if (reauth) return { ...reauth, field: 'currentPassword' };
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) return { error: mapAuthError(error) };

      // Revoke every OTHER session. Supabase keeps them alive across a password
      // change, so without this a session that was already stolen survives the
      // very action taken to shut it out. Best-effort: the password IS changed,
      // so a failure here must not be reported as a failed change.
      await supabase.auth.signOut({ scope: 'others' }).catch(() => undefined);
      // Setting a FIRST password adds the `email` identity, so the linked
      // providers just changed — pick that up rather than leaving the account
      // screen showing Google alone.
      await refreshIdentity();
      return {};
    },
    [user, refreshIdentity],
  );

  const linkProvider = useCallback<
    AuthContextValue['linkProvider']
  >(async () => {
    const { error } = await linkGoogleIdentity();
    if (error) return error === 'cancelled' ? {} : { error };
    // The identity was attached server-side; the JWT in hand still lists the
    // old provider set, so re-read it or the row would keep saying "Connect".
    await refreshIdentity();
    return {};
  }, [refreshIdentity]);

  const resyncUser = useCallback<AuthContextValue['resyncUser']>(
    async () => ((await syncUser()) ? {} : { error: true }),
    [],
  );

  const deleteAccount = useCallback<
    AuthContextValue['deleteAccount']
  >(async () => {
    try {
      await getApiClient().DELETE('/api/v1/users/me');
    } catch (e) {
      return {
        error:
          e instanceof ApiRequestError
            ? e.message
            : 'Could not delete your account.',
      };
    }
    await signOut();
    return {};
  }, [signOut]);

  const value = useMemo(
    () => ({
      status,
      user,
      providers,
      googleAvatarUrl,
      signIn,
      signUp,
      signInWithGoogle,
      sendReset,
      changePassword,
      linkProvider,
      resyncUser,
      deleteAccount,
      signOut,
      signOutEverywhere,
    }),
    [
      status,
      user,
      providers,
      googleAvatarUrl,
      signIn,
      signUp,
      signInWithGoogle,
      sendReset,
      changePassword,
      linkProvider,
      resyncUser,
      deleteAccount,
      signOut,
      signOutEverywhere,
    ],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}
