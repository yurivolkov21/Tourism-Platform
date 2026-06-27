'use client';

import Link from 'next/link';
import { useActionState } from 'react';

import { Button, Input, Label } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { signUp, type SignUpState } from '../../lib/auth/actions';
import { ResendConfirmation } from './resend-confirmation';

export function RegisterForm() {
  const t = messages.auth.register;
  const [state, formAction, pending] = useActionState<SignUpState, FormData>(signUp, {});

  if (state.sent) {
    return (
      <div className="space-y-2 text-center" role="status">
        <h2 className="font-heading text-xl font-semibold">{t.checkInboxTitle}</h2>
        <p className="text-muted-foreground text-sm text-pretty">{t.checkInboxBody}</p>
        {state.email ? (
          <div className="pt-2">
            <ResendConfirmation email={state.email} />
          </div>
        ) : null}
        <p className="text-muted-foreground pt-2 text-sm">
          {t.haveAccount}{' '}
          <Link href="/login" className="text-primary font-medium hover:underline">
            {t.loginCta}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
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
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirm">{t.confirmLabel}</Label>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
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
        {t.haveAccount}{' '}
        <Link href="/login" className="text-primary font-medium hover:underline">
          {t.loginCta}
        </Link>
      </p>
    </form>
  );
}

export default RegisterForm;
