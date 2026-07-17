'use client';

import { useState, type FormEvent } from 'react';

import { Button, toast } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { authErrorMessage } from '../../lib/auth/auth-error';
import {
  validateResetFields,
  type ResetFieldErrors,
} from '../../lib/auth/validate';
import { createClient } from '../../lib/supabase/client';
import { AuthFormField } from '../auth/auth-form-field';
import { PasswordField } from '../auth/password-field';

/** Change password while signed in (browser `updateUser`). */
export function ChangePasswordForm() {
  const t = messages.auth.account.securityPage.password;
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<ResetFieldErrors>({});
  const [pw, setPw] = useState('');

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);

    const form = event.currentTarget;
    const data = new FormData(form);
    const password = String(data.get('password') ?? '');
    const confirm = String(data.get('confirm') ?? '');

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
      toast.error(authErrorMessage(updateError));
      setPending(false);
      return;
    }

    form.reset();
    setPw('');
    toast.success(t.success);
    setPending(false);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <h3 className="text-sm font-medium">{t.heading}</h3>
      <PasswordField
        id="new-password"
        name="password"
        label={t.newLabel}
        value={pw}
        onChange={setPw}
        code={fieldErrors.password}
        showMeter
      />
      <AuthFormField
        id="confirm-password"
        label={t.confirmLabel}
        name="confirm"
        type="password"
        autoComplete="new-password"
        required
        field="confirm"
        code={fieldErrors.confirm}
      />
      <Button type="submit" disabled={pending}>
        {pending ? t.submitting : t.submit}
      </Button>
    </form>
  );
}

export default ChangePasswordForm;
