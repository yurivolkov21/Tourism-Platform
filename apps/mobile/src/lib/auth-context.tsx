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
import { getApiClient } from './api';
import { mapAuthError, type AuthErrorKey } from './auth';
import { supabase } from './supabase';

export interface AuthContextValue {
  status: 'loading' | 'signedIn' | 'signedOut';
  user: { id: string; email?: string } | null;
  signIn(email: string, password: string): Promise<{ error?: AuthErrorKey }>;
  signUp(
    fullName: string,
    email: string,
    password: string,
  ): Promise<{ error?: AuthErrorKey; confirmationSent?: boolean }>;
  sendReset(email: string): Promise<{ error?: AuthErrorKey }>;
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setStatus(data.session ? 'signedIn' : 'signedOut');
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setStatus(session ? 'signedIn' : 'signedOut');
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = useCallback<AuthContextValue['signIn']>(
    async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: mapAuthError(error) };
      await syncUser();
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
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
      return {};
    },
    [queryClient],
  );

  const sendReset = useCallback<AuthContextValue['sendReset']>(async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return error ? { error: mapAuthError(error) } : {};
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    queryClient.removeQueries({ queryKey: ['wishlist'] });
    queryClient.removeQueries({ queryKey: ['profile'] });
  }, [queryClient]);

  const value = useMemo(
    () => ({ status, user, signIn, signUp, sendReset, signOut }),
    [status, user, signIn, signUp, sendReset, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}
