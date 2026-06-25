'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { createClient } from '../supabase/server';
import { authErrorMessage } from './auth-error';
import { safeRedirect } from './safe-redirect';
import { syncUser } from './sync-user';

export interface SignInState {
  error?: string;
}

export interface SignUpState {
  error?: string;
  /** Set once the confirmation email has been sent → the form shows "check your inbox". */
  sent?: boolean;
}

const MIN_PASSWORD = 6;

/** Email + password sign-in → mirror the user (best-effort) → redirect to a safe local path. */
export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const redirectTo = safeRedirect(formData.get('redirect')?.toString(), '/account');

  if (!email || !password) return { error: 'Enter your email and password.' };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: authErrorMessage(error) };

  await syncUser();
  redirect(redirectTo);
}

/** Email + password sign-up with email confirmation → returns `sent` so the UI shows "check inbox". */
export async function signUp(_prev: SignUpState, formData: FormData): Promise<SignUpState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');

  if (!email || !password) return { error: 'Enter your email and password.' };
  if (password.length < MIN_PASSWORD) {
    return { error: `Password must be at least ${MIN_PASSWORD} characters.` };
  }
  if (password !== confirm) return { error: 'Passwords do not match.' };

  // Confirmation link returns to our /auth/callback on the same origin the form was posted from.
  const h = await headers();
  const origin = h.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3001';

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) return { error: authErrorMessage(error) };

  return { sent: true };
}

/** Sign out and return to the home page. */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}
