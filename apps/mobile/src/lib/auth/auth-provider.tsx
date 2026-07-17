import type { Session, User } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { setApiTokenGetter } from '../api/client';
import { getSupabaseClient } from '../supabase/client';
import { authErrorMessage } from './auth-error';
import { syncUser } from './sync-user';

export type AuthStatus = 'loading' | 'signedIn' | 'signedOut';

export interface SignUpParams {
  email: string;
  password: string;
  fullName: string;
}

type AuthContextValue = {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (params: SignUpParams) => Promise<{ error?: string; sent?: boolean }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  // Mirrors `session` synchronously so the token getter never has to call back
  // into Supabase (see effect below for why that matters).
  const sessionRef = useRef<Session | null>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();
    // Read the ref synchronously — calling `supabase.auth.getSession()` again
    // here would re-enter the Supabase auth client while `onAuthStateChange`
    // may still hold its internal lock, which can hand back a stale/invalid
    // token (the documented cause of "don't call async Supabase methods
    // synchronously inside onAuthStateChange").
    setApiTokenGetter(() => sessionRef.current?.access_token ?? null);

    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      sessionRef.current = data.session;
      setSession(data.session);
      setStatus(data.session ? 'signedIn' : 'signedOut');
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      sessionRef.current = nextSession;
      setSession(nextSession);
      setStatus(nextSession ? 'signedIn' : 'signedOut');
      if (nextSession) {
        // Defer off the callback's synchronous tick (Supabase's own guidance)
        // instead of calling out immediately from inside onAuthStateChange.
        setTimeout(() => void syncUser(nextSession), 0);
      }
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
      setApiTokenGetter(undefined);
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = getSupabaseClient();
    // Sync itself is triggered by the onAuthStateChange listener above once
    // the session lands — no need to duplicate the call here.
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: authErrorMessage(error) };
    return {};
  }, []);

  const signUp = useCallback(async ({ email, password, fullName }: SignUpParams) => {
    const supabase = getSupabaseClient();
    // The confirmation email always links to the web app's own `/auth/confirm`
    // route (token_hash-based, hardcoded in the Supabase email template — not
    // driven by `emailRedirectTo`). The user confirms in the browser, then
    // returns to the app and logs in manually; see docs/07-plans for the
    // follow-up needed to hand a confirmed session back to the app directly.
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) return { error: authErrorMessage(error) };
    return { sent: true };
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
  }, []);

  const value = useMemo(
    () => ({ status, session, user: session?.user ?? null, signIn, signUp, signOut }),
    [status, session, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
