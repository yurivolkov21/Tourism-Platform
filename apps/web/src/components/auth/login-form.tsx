'use client';

import Link from 'next/link';
import { useActionState } from 'react';

import { Button, Input, Label } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { signIn, type SignInState } from '../../lib/auth/actions';

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const t = messages.auth.login;
  const [state, formAction, pending] = useActionState<SignInState, FormData>(signIn, {});

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="redirect" value={redirectTo} />

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

      {state.error ? (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
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
