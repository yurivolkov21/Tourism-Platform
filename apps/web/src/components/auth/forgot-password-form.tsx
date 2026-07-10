'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';

import { Button, Input, Label } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import {
  validateEmailField,
  type FieldErrorCode,
} from '../../lib/auth/validate';
import { createClient } from '../../lib/supabase/client';
import { AuthFieldError } from './auth-field-error';

/**
 * Request a password-reset email (browser client). The link returns to `/auth/callback?redirect=
 * /reset-password`, which exchanges the recovery code → session → forwards to the reset form. Always
 * shows "sent" (never reveals whether the email has an account).
 */
export function ForgotPasswordForm() {
  const t = messages.auth.forgot;
  const [sent, setSent] = useState(false);
  const [fieldError, setFieldError] = useState<FieldErrorCode>();
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);

    const email = String(
      new FormData(event.currentTarget).get('email') ?? '',
    ).trim();

    const invalid = validateEmailField(email);
    setFieldError(invalid ?? undefined);
    if (invalid) {
      setPending(false);
      return;
    }
    const supabase = createClient();
    await supabase.auth
      .resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?redirect=/reset-password`,
      })
      .catch(() => {
        // Swallow — we show the same "sent" state regardless, to avoid leaking account existence.
      });

    setSent(true);
    setPending(false);
  }

  if (sent) {
    return (
      <div className="space-y-2 text-center" role="status">
        <h2 className="font-heading text-xl font-semibold">{t.sentTitle}</h2>
        <p className="text-muted-foreground text-sm text-pretty">
          {t.sentBody}
        </p>
        <p className="pt-2 text-sm">
          <Link
            href="/login"
            className="text-primary font-medium hover:underline"
          >
            {t.backToLogin}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">{t.emailLabel}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          aria-required="true"
          placeholder="you@example.com"
          aria-invalid={Boolean(fieldError)}
          aria-describedby={fieldError ? 'email-error' : undefined}
        />
        <AuthFieldError id="email-error" field="email" code={fieldError} />
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? t.submitting : t.submit}
      </Button>

      <p className="text-muted-foreground text-center text-sm">
        <Link
          href="/login"
          className="text-primary font-medium hover:underline"
        >
          {t.backToLogin}
        </Link>
      </p>
    </form>
  );
}

export default ForgotPasswordForm;
