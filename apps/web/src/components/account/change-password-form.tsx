'use client';

import { useState, type FormEvent } from 'react';

import { toast } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { useSaveState } from '../../hooks/use-save-state';
import { authErrorMessage } from '../../lib/auth/auth-error';
import {
  validateResetFields,
  type ResetFieldErrors,
} from '../../lib/auth/validate';
import { createClient } from '../../lib/supabase/client';
import { AuthFormField } from '../auth/auth-form-field';
import { PasswordField } from '../auth/password-field';
import { FormActions } from './form-actions';
import { SaveButton } from './save-button';

/** Change password while signed in (browser `updateUser`). */
export function ChangePasswordForm() {
  const t = messages.auth.account.securityPage.password;
  const save = useSaveState();
  const [fieldErrors, setFieldErrors] = useState<ResetFieldErrors>({});
  const [pw, setPw] = useState('');

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (save.busy) return;
    save.start();

    const form = event.currentTarget;
    const data = new FormData(form);
    const password = String(data.get('password') ?? '');
    const confirm = String(data.get('confirm') ?? '');

    const invalid = validateResetFields({ password, confirm });
    setFieldErrors(invalid);
    if (Object.keys(invalid).length > 0) {
      save.fail();
      return;
    }

    const { error: updateError } = await createClient().auth.updateUser({
      password,
    });
    if (updateError) {
      toast.error(authErrorMessage(updateError));
      save.fail();
      return;
    }

    form.reset();
    setPw('');
    toast.success(t.success);
    save.succeed();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
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
      <FormActions flash={save.flash}>
        <SaveButton
          state={save.state}
          label={t.submit}
          pendingLabel={t.submitting}
          doneLabel={messages.auth.account.settings.savedShort}
        />
      </FormActions>
    </form>
  );
}

export default ChangePasswordForm;
