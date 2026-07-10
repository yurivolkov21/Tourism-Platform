'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { Button, Input, Label } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { authErrorMessage } from '../../lib/auth/auth-error';
import {
  validateResetFields,
  type ResetFieldErrors,
} from '../../lib/auth/validate';
import { createClient } from '../../lib/supabase/client';
import { AuthFieldError } from './auth-field-error';

/**
 * Set a new password. Reached via the recovery session the callback established (the page guards that
 * a session exists). On success the user is already signed in → straight to the account.
 */
export function ResetPasswordForm() {
  const t = messages.auth.reset;
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<ResetFieldErrors>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(undefined);

    const form = new FormData(event.currentTarget);
    const password = String(form.get('password') ?? '');
    const confirm = String(form.get('confirm') ?? '');

    const invalid = validateResetFields({ password, confirm });
    setFieldErrors(invalid);
    if (Object.keys(invalid).length > 0) {
      setPending(false);
      return;
    }

    const { error: updateError } = await createClient().auth.updateUser({
      password,
    });
    if (updateError) {
      setError(authErrorMessage(updateError));
      setPending(false);
      return;
    }

    router.push('/account');
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
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

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? t.submitting : t.submit}
      </Button>
    </form>
  );
}

export default ResetPasswordForm;
