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
import { signInWithGoogle as googleSignIn } from './google-auth';
import { readGoogleAvatarUrl, readProviders } from './providers';
import { supabase } from './supabase';

export interface AuthContextValue {
  status: 'loading' | 'signedIn' | 'signedOut';
  user: { id: string; email?: string } | null;
  /** Linked Supabase sign-in methods (`app_metadata.providers`) — Connected accounts is read-only. */
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
  changePassword(password: string): Promise<{ error?: AuthErrorKey }>;
  /** Deletes the account server-side, then signs out. `error` is a server-provided message when
   * available (e.g. active bookings block deletion), else a generic fallback. */
  deleteAccount(): Promise<{ error?: string }>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Mirror the signed-in user into the API DB (idempotent; API 401s unsynced users otherwise). */
async function syncUser(fullName?: string): Promise<void> {
  try {
    await getApiClient().POST('/api/v1/auth/sync', {
      body: fullName ? { fullName } : {},
    });
  } catch {
    // Non-fatal: the next authed call surfaces a real error state if sync keeps failing.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthContextValue['status']>('loading');
  const [user, setUser] = useState<AuthContextValue['user']>(null);
  const [providers, setProviders] = useState<string[]>([]);
  const [googleAvatarUrl, setGoogleAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setProviders(readProviders(data.session?.user.app_metadata));
      setGoogleAvatarUrl(readGoogleAvatarUrl(data.session?.user.user_metadata));
      setStatus(data.session ? 'signedIn' : 'signedOut');
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setProviders(readProviders(session?.user.app_metadata));
      setGoogleAvatarUrl(readGoogleAvatarUrl(session?.user.user_metadata));
      setStatus(session ? 'signedIn' : 'signedOut');
    });
    return () => sub.subscription.unsubscribe();
  }, []);

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
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      return error ? { error: mapAuthError(error) } : {};
    },
    [],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    queryClient.removeQueries({ queryKey: ['wishlist'] });
    queryClient.removeQueries({ queryKey: ['profile'] });
    // Bookings are account-scoped PII — never let them survive an account switch.
    queryClient.removeQueries({ queryKey: ['bookings'] });
  }, [queryClient]);

  const changePassword = useCallback<AuthContextValue['changePassword']>(
    async (password) => {
      const { error } = await supabase.auth.updateUser({ password });
      return error ? { error: mapAuthError(error) } : {};
    },
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
      deleteAccount,
      signOut,
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
      deleteAccount,
      signOut,
    ],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}
