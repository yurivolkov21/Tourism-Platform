'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { Button } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { mirrorUser } from '../../lib/auth/actions';
import { authErrorMessage } from '../../lib/auth/auth-error';
import { safeRedirect } from '../../lib/auth/safe-redirect';
import {
  validateLoginFields,
  type LoginFieldErrors,
} from '../../lib/auth/validate';
import { createClient } from '../../lib/supabase/client';
import { AuthFormField } from './auth-form-field';

/**
 * Client-side sign-in: authenticate in the browser so the AuthProvider's `onAuthStateChange` updates
 * the navbar immediately (a server action wouldn't notify the browser client → stale until reload).
 * Then mirror the user server-side (best-effort) and navigate to a safe local path.
 */
export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const t = messages.auth.login;
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(undefined);

    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');

    const invalid = validateLoginFields({ email, password });
    setFieldErrors(invalid);
    if (Object.keys(invalid).length > 0) {
      setPending(false);
      return;
    }

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) {
      setError(authErrorMessage(signInError));
      setPending(false);
      return;
    }

    // Mirror the user, but never let it block the redirect — a cold API (Render free tier) can take
    // tens of seconds, and the booking flow self-heals an unsynced user anyway. Wait briefly, then go.
    await Promise.race([
      mirrorUser().catch(() => undefined),
      new Promise((resolve) => setTimeout(resolve, 2500)),
    ]);

    router.push(safeRedirect(redirectTo, '/account'));
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <AuthFormField
        id="email"
        label={t.emailLabel}
        name="email"
        type="email"
        autoComplete="email"
        required
        placeholder={messages.common.emailPlaceholder}
        field="email"
        code={fieldErrors.email}
      />

      <AuthFormField
        id="password"
        label={t.passwordLabel}
        name="password"
        type="password"
        autoComplete="current-password"
        required
        field="password"
        code={fieldErrors.password}
        after={
          <div className="text-right">
            <Link
              href="/forgot-password"
              className="text-muted-foreground hover:text-foreground text-sm"
            >
              {t.forgotCta}
            </Link>
          </div>
        }
      />

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? t.submitting : t.submit}
      </Button>

      <p className="text-muted-foreground text-center text-sm">
        {t.noAccount}{' '}
        <Link
          href="/register"
          className="text-primary font-medium hover:underline"
        >
          {t.registerCta}
        </Link>
      </p>
    </form>
  );
}

export default LoginForm;
