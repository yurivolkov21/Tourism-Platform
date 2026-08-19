'use client';

import { useState, type FormEvent } from 'react';

import { toast } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { useSaveState } from '../../hooks/use-save-state';
import { authErrorMessage } from '../../lib/auth/auth-error';
import {
  validateEmailField,
  type FieldErrorCode,
} from '../../lib/auth/validate';
import { createClient } from '../../lib/supabase/client';
import { AuthFormField } from '../auth/auth-form-field';
import { FormActions } from './form-actions';
import { SaveButton } from './save-button';

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
  const save = useSaveState();
  const [emailError, setEmailError] = useState<FieldErrorCode>();
  const [passwordError, setPasswordError] = useState<FieldErrorCode>();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (save.busy) return;
    save.start();

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
      save.fail();
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
      save.fail();
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
      save.fail();
      return;
    }

    toast.success(`${t.sent} ${t.sentHint}`);
    save.succeed();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
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
        // Re-auth field: `new-password` (not `current-password`/`off`) is the
        // reliable way to stop Chrome autofilling the saved login password here,
        // so confirming an email change stays a deliberate, typed action. Chrome
        // may offer "suggest strong password" on focus — it does not pre-fill.
        autoComplete="new-password"
        required
        field="password"
        code={passwordError}
      />
      <FormActions flash={save.flash}>
        <SaveButton
          state={save.state}
          label={t.submit}
          pendingLabel={t.submitting}
          doneLabel={t.sentShort}
        />
      </FormActions>
    </form>
  );
}

export default ChangeEmailForm;
