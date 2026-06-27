'use client';

import { useState, type FormEvent } from 'react';

import { Button, Input, Label } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { authErrorMessage } from '../../lib/auth/auth-error';
import { validatePasswordPair } from '../../lib/auth/password';
import { createClient } from '../../lib/supabase/client';

/** Change password while signed in (browser `updateUser`). */
export function ChangePasswordForm() {
  const t = messages.auth.account.securityPage.password;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [done, setDone] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(undefined);
    setDone(false);

    const form = event.currentTarget;
    const data = new FormData(form);
    const password = String(data.get('password') ?? '');
    const confirm = String(data.get('confirm') ?? '');

    const invalid = validatePasswordPair(password, confirm);
    if (invalid) {
      setError(messages.auth.passwordErrors[invalid]);
      setPending(false);
      return;
    }

    const { error: updateError } = await createClient().auth.updateUser({ password });
    if (updateError) {
      setError(authErrorMessage(updateError));
      setPending(false);
      return;
    }

    form.reset();
    setDone(true);
    setPending(false);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h2 className="font-heading text-lg font-semibold">{t.heading}</h2>
      <div className="space-y-1.5">
        <Label htmlFor="new-password">{t.newLabel}</Label>
        <Input id="new-password" name="password" type="password" autoComplete="new-password" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm-password">{t.confirmLabel}</Label>
        <Input
          id="confirm-password"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
        />
      </div>
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
      {done ? (
        <p className="text-success text-sm" role="status">
          {t.success}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? t.submitting : t.submit}
      </Button>
    </form>
  );
}

export default ChangePasswordForm;
