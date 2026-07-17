'use client';

import { useState, type FormEvent } from 'react';

import { Button, toast } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { authErrorMessage } from '../../lib/auth/auth-error';
import {
  validateEmailField,
  type FieldErrorCode,
} from '../../lib/auth/validate';
import { createClient } from '../../lib/supabase/client';
import { AuthFormField } from '../auth/auth-form-field';

/**
 * Change email while signed in — **password accounts only** (the profile page gates this via
 * `canChangeEmail`, so no OAuth branch here). The user re-authenticates with their current
 * password (`signInWithPassword` verify — Supabase has no dedicated verify-password API) before
 * `updateUser` fires. Supabase then emails a confirmation to the new address; the change lands
 * once confirmed via `/auth/confirm` (token_hash), which also re-syncs the API mirror and emails
 * the old address a "your email was changed" notice. We just show "confirmation sent".
 */
export function ChangeEmailForm({ currentEmail }: { currentEmail: string }) {
  const t = messages.auth.account.securityPage.email;
  const [pending, setPending] = useState(false);
  const [emailError, setEmailError] = useState<FieldErrorCode>();
  const [passwordError, setPasswordError] = useState<FieldErrorCode>();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);

    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');

    const emailInvalid = validateEmailField(email);
    const passwordInvalid: FieldErrorCode | undefined = password
      ? undefined
      : 'REQUIRED';
    setEmailError(emailInvalid ?? undefined);
    setPasswordError(passwordInvalid);
    if (emailInvalid || passwordInvalid) {
      setPending(false);
      return;
    }

    const supabase = createClient();
    // Re-authenticate: verify the current password before allowing the change.
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: currentEmail,
      password,
    });
    if (reauthError) {
      setPasswordError('INCORRECT');
      setPending(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser(
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
      <AuthFormField
        id="current-email"
        label={t.currentLabel}
        type="email"
        value={currentEmail}
        disabled
        readOnly
      />
      <AuthFormField
        id="new-email"
        label={t.newLabel}
        name="email"
        type="email"
        autoComplete="email"
        required
        field="email"
        code={emailError}
      />
      <AuthFormField
        id="current-password"
        label={t.currentPasswordLabel}
        name="password"
        type="password"
        // Re-auth field: discourage the browser from autofilling the saved
        // password so confirming an email change is a deliberate, typed action
        // (best-effort — autofill suppression is browser-dependent).
        autoComplete="off"
        required
        field="password"
        code={passwordError}
      />
      <Button type="submit" disabled={pending}>
        {pending ? t.submitting : t.submit}
      </Button>
    </form>
  );
}

export default ChangeEmailForm;
