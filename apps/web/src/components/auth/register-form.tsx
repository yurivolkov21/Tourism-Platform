'use client';

import Link from 'next/link';
import { useActionState } from 'react';

import { Button, Input, Label } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { signUp, type SignUpState } from '../../lib/auth/actions';
import { AuthFieldError } from './auth-field-error';
import { ResendConfirmation } from './resend-confirmation';

export function RegisterForm() {
  const t = messages.auth.register;
  const [state, formAction, pending] = useActionState<SignUpState, FormData>(
    signUp,
    {},
  );
  // Server-validated per-field codes from the `signUp` action (empty until a submit comes back).
  const fieldErrors = state.fieldErrors ?? {};

  if (state.sent) {
    return (
      <div className="space-y-2 text-center" role="status">
        <h2 className="font-heading text-xl font-semibold">
          {t.checkInboxTitle}
        </h2>
        <p className="text-muted-foreground text-sm text-pretty">
          {t.checkInboxBody}
        </p>
        {state.email ? (
          <div className="pt-2">
            <ResendConfirmation email={state.email} />
          </div>
        ) : null}
        <p className="text-muted-foreground pt-2 text-sm">
          {t.haveAccount}{' '}
          <Link
            href="/login"
            className="text-primary font-medium hover:underline"
          >
            {t.loginCta}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} noValidate className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="fullName">{t.fullNameLabel}</Label>
        <Input
          id="fullName"
          name="fullName"
          autoComplete="name"
          aria-required="true"
          placeholder="Nguyen Van A"
          aria-invalid={Boolean(fieldErrors.fullName)}
          aria-describedby={fieldErrors.fullName ? 'fullName-error' : undefined}
        />
        <AuthFieldError
          id="fullName-error"
          field="fullName"
          code={fieldErrors.fullName}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">{t.emailLabel}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          aria-required="true"
          placeholder="you@example.com"
          aria-invalid={Boolean(fieldErrors.email)}
          aria-describedby={fieldErrors.email ? 'email-error' : undefined}
        />
        <AuthFieldError
          id="email-error"
          field="email"
          code={fieldErrors.email}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">{t.passwordLabel}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          aria-required="true"
          aria-invalid={Boolean(fieldErrors.password)}
          aria-describedby={fieldErrors.password ? 'password-error' : undefined}
        />
        <AuthFieldError
          id="password-error"
          field="password"
          code={fieldErrors.password}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirm">{t.confirmLabel}</Label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          aria-required="true"
          aria-invalid={Boolean(fieldErrors.confirm)}
          aria-describedby={fieldErrors.confirm ? 'confirm-error' : undefined}
        />
        <AuthFieldError
          id="confirm-error"
          field="confirm"
          code={fieldErrors.confirm}
        />
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
        <Link
          href="/login"
          className="text-primary font-medium hover:underline"
        >
          {t.loginCta}
        </Link>
      </p>
    </form>
  );
}

export default RegisterForm;
