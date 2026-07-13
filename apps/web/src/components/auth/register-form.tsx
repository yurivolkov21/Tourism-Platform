'use client';

import Link from 'next/link';
import { useActionState } from 'react';

import { Button } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { signUp, type SignUpState } from '../../lib/auth/actions';
import { AuthFormField } from './auth-form-field';
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
      <AuthFormField
        id="fullName"
        label={t.fullNameLabel}
        name="fullName"
        autoComplete="name"
        required
        placeholder={messages.auth.register.namePlaceholder}
        field="fullName"
        code={fieldErrors.fullName}
      />

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
        autoComplete="new-password"
        required
        field="password"
        code={fieldErrors.password}
      />

      <AuthFormField
        id="confirm"
        label={t.confirmLabel}
        name="confirm"
        type="password"
        autoComplete="new-password"
        required
        field="confirm"
        code={fieldErrors.confirm}
      />

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
