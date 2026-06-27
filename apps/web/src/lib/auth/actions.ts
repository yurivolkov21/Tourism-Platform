'use server';

import { headers } from 'next/headers';

import { createClient } from '../supabase/server';
import { authErrorMessage } from './auth-error';
import { syncUser } from './sync-user';

export interface SignUpState {
  error?: string;
  /** Set once the confirmation email has been sent → the form shows "check your inbox". */
  sent?: boolean;
  /** The address the confirmation went to (so the UI can offer "resend"). */
  email?: string;
}

const MIN_PASSWORD = 6;

/**
 * Mirror the signed-in Supabase user into the API's local DB (best-effort). Called from the client
 * right after a browser sign-in — sign-in/out run in the browser so the AuthProvider reacts live;
 * this server action just performs the server-side mirror that needs the cookie-bound session.
 */
export async function mirrorUser(): Promise<void> {
  await syncUser();
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

  return { sent: true, email };
}
