'use server';

import { headers } from 'next/headers';

import { createClient } from '../supabase/server';
import { authErrorMessage } from './auth-error';
import { syncUser } from './sync-user';
import { validateSignUpFields, type SignUpFieldErrors } from './validate';

export interface SignUpState {
  /** Form-level failure from Supabase (already user-readable via `authErrorMessage`). */
  error?: string;
  /** Server-validated per-field error codes → the form maps them to `messages.auth.fieldErrors`. */
  fieldErrors?: SignUpFieldErrors;
  /** Set once the confirmation email has been sent → the form shows "check your inbox". */
  sent?: boolean;
  /** The address the confirmation went to (so the UI can offer "resend"). */
  email?: string;
}

/**
 * Mirror the signed-in Supabase user into the API's local DB (best-effort). Called from the client
 * right after a browser sign-in — sign-in/out run in the browser so the AuthProvider reacts live;
 * this server action just performs the server-side mirror that needs the cookie-bound session.
 */
export async function mirrorUser(): Promise<void> {
  await syncUser();
}

/** Email + password sign-up with email confirmation → returns `sent` so the UI shows "check inbox". */
export async function signUp(
  _prev: SignUpState,
  formData: FormData,
): Promise<SignUpState> {
  const fullName = String(formData.get('fullName') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');

  const fieldErrors = validateSignUpFields({
    fullName,
    email,
    password,
    confirm,
  });
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  // Confirmation link returns to our /auth/callback on the same origin the form was posted from.
  const h = await headers();
  const origin =
    h.get('origin') ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    'http://localhost:3001';

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    // Store the name in user metadata → the navbar greets by name immediately, and `syncUser`
    // forwards it to the API so the profile is pre-filled.
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: { full_name: fullName },
    },
  });
  if (error) return { error: authErrorMessage(error) };

  return { sent: true, email };
}
