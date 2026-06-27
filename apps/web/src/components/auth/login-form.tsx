'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { Button, Input, Label } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { mirrorUser } from '../../lib/auth/actions';
import { authErrorMessage } from '../../lib/auth/auth-error';
import { safeRedirect } from '../../lib/auth/safe-redirect';
import { createClient } from '../../lib/supabase/client';

/**
 * Client-side sign-in: authenticate in the browser so the AuthProvider's `onAuthStateChange` updates
 * the navbar immediately (a server action wouldn't notify the browser client → stale until reload).
 * Then mirror the user server-side (best-effort) and navigate to a safe local path.
 */
export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const t = messages.auth.login;
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(undefined);

    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');
    if (!email || !password) {
      setError('Enter your email and password.');
      setPending(false);
      return;
    }

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(authErrorMessage(signInError));
      setPending(false);
      return;
    }

    await mirrorUser().catch(() => {
      // Best-effort; the booking flow self-heals an unsynced user. Don't block sign-in.
    });

    router.push(safeRedirect(redirectTo, '/account'));
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">{t.emailLabel}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">{t.passwordLabel}</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>

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
        <Link href="/register" className="text-primary font-medium hover:underline">
          {t.registerCta}
        </Link>
      </p>
    </form>
  );
}

export default LoginForm;
