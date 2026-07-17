'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { Button } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { authErrorMessage } from '../../lib/auth/auth-error';
import {
  validateResetFields,
  type ResetFieldErrors,
} from '../../lib/auth/validate';
import { createClient } from '../../lib/supabase/client';
import { AuthFormField } from './auth-form-field';
import { PasswordField } from './password-field';

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
  const [pw, setPw] = useState('');

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
      <PasswordField
        id="password"
        name="password"
        label={t.passwordLabel}
        value={pw}
        onChange={setPw}
        code={fieldErrors.password}
        showMeter
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
