'use client';

import { useState, type FormEvent } from 'react';

import { Button, Input, Label, toast } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { authErrorMessage } from '../../lib/auth/auth-error';
import {
  validateEmailField,
  type FieldErrorCode,
} from '../../lib/auth/validate';
import { createClient } from '../../lib/supabase/client';
import { AuthFieldError } from '../auth/auth-field-error';

/**
 * Change email while signed in. Supabase emails a confirmation (to both addresses); the change lands
 * once confirmed — the link returns through `/auth/callback`. We just show "confirmation sent".
 */
export function ChangeEmailForm({ currentEmail }: { currentEmail: string }) {
  const t = messages.auth.account.securityPage.email;
  const [pending, setPending] = useState(false);
  const [fieldError, setFieldError] = useState<FieldErrorCode>();

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
    const { error: updateError } = await createClient().auth.updateUser(
      { email },
      {
        emailRedirectTo: `${window.location.origin}/auth/callback?redirect=/account`,
      },
    );
    if (updateError) {
      toast.error(authErrorMessage(updateError));
      setPending(false);
      return;
    }

    toast.success(`${t.sent} ${t.sentHint}`);
    setPending(false);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <h3 className="text-sm font-medium">{t.heading}</h3>
      <div className="space-y-1.5">
        <Label htmlFor="current-email">{t.currentLabel}</Label>
        <Input
          id="current-email"
          type="email"
          value={currentEmail}
          disabled
          readOnly
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="new-email">{t.newLabel}</Label>
        <Input
          id="new-email"
          name="email"
          type="email"
          autoComplete="email"
          aria-required="true"
          aria-invalid={Boolean(fieldError)}
          aria-describedby={fieldError ? 'new-email-error' : undefined}
        />
        <AuthFieldError id="new-email-error" field="email" code={fieldError} />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? t.submitting : t.submit}
      </Button>
    </form>
  );
}

export default ChangeEmailForm;
