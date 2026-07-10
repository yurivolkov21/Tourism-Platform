'use server';

import { redirect } from 'next/navigation';

import { apiErrorMessage } from '../api/error';
import { apiWrite } from '../api/client';
import { createClient } from '../supabase/server';
import { authErrorMessage } from './auth-error';
import { safeRedirect } from './safe-redirect';
import { validateSignInFields, type SignInFieldErrors } from './validate';

export interface SignInState {
  /** Form-level failure (Supabase / admin-sync API). */
  error?: string;
  /** Server-validated per-field messages (the form is `noValidate`). */
  fieldErrors?: SignInFieldErrors;
}

/**
 * Sign in (email + password), then mirror/elevate to ADMIN via `POST /auth/admin/sync`. A 403 there
 * means the email isn't on the API's `ADMIN_EMAILS` allowlist → we sign the user back out and explain.
 */
export async function signIn(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const redirectTo = safeRedirect(formData.get('redirect')?.toString(), '/');

  const fieldErrors = validateSignInFields({ email, password });
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) return { error: authErrorMessage(error) };

  try {
    // Pass the just-minted token explicitly (the new session cookie may not be readable yet this
    // request). Native-fetch write — the typed client's streamed body fails on Vercel.
    await apiWrite(
      'POST',
      '/api/v1/auth/admin/sync',
      {},
      data.session?.access_token,
    );
  } catch (e) {
    await supabase.auth.signOut();
    return { error: apiErrorMessage(e) };
  }

  redirect(redirectTo);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
