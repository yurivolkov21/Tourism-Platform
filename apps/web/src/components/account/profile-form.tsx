'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { toast } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { useSaveState } from '../../hooks/use-save-state';
import { saveProfile } from '../../lib/account/actions';
import { buildUpdateProfilePayload } from '../../lib/account/profile-form';
import { createClient } from '../../lib/supabase/client';
import { AuthFormField } from '../auth/auth-form-field';
import { FormActions } from './form-actions';
import { SaveButton } from './save-button';

/**
 * Edit name + phone. Saves via the `saveProfile` server action (`PATCH /users/me`), then syncs the
 * Supabase display name in the browser so the navbar's AuthProvider reflects it live.
 */
export function ProfileForm({
  email,
  fullName,
  phone,
}: {
  email: string;
  fullName: string;
  phone: string;
}) {
  const t = messages.auth.account.profile;
  const router = useRouter();
  const save = useSaveState();

  const [values, setValues] = useState({ fullName, phone });
  // What the server currently holds. Re-baselined after a save rather than read back from props:
  // `router.refresh()` re-renders this same instance, so prop-derived state would not reset on its
  // own and the button would stay enabled over values that are already stored.
  const [saved, setSaved] = useState({ fullName, phone });

  // Compared trimmed, because `buildUpdateProfilePayload` trims too — typing a trailing space is
  // not a change the server would record, so it must not light the button up either.
  const dirty =
    values.fullName.trim() !== saved.fullName.trim() ||
    values.phone.trim() !== saved.phone.trim();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (save.busy || !dirty) return;
    save.start();

    const payload = buildUpdateProfilePayload(values);

    const result = await saveProfile(payload);
    if (result.error) {
      toast.error(result.error);
      save.fail();
      return;
    }

    // Mirror the name into Supabase metadata so the navbar (AuthProvider) updates live.
    await createClient()
      .auth.updateUser({ data: { full_name: payload.fullName ?? '' } })
      .catch(() => {
        // Best-effort navbar sync; the API profile is already saved.
      });

    toast.success(t.saved);
    setSaved(values);
    save.succeed();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <AuthFormField
        id="fullName"
        label={t.fullNameLabel}
        name="fullName"
        autoComplete="name"
        value={values.fullName}
        onChange={(event) =>
          setValues((v) => ({ ...v, fullName: event.target.value }))
        }
      />

      <AuthFormField
        id="phone"
        label={t.phoneLabel}
        name="phone"
        type="tel"
        autoComplete="tel"
        value={values.phone}
        onChange={(event) =>
          setValues((v) => ({ ...v, phone: event.target.value }))
        }
      />

      <AuthFormField
        id="email"
        label={t.emailLabel}
        type="email"
        value={email}
        disabled
        readOnly
        hint={t.emailHint}
      />

      <FormActions flash={save.flash}>
        <SaveButton
          state={save.state}
          label={t.save}
          pendingLabel={t.saving}
          doneLabel={messages.auth.account.settings.savedShort}
          disabled={!dirty}
        />
      </FormActions>
    </form>
  );
}

export default ProfileForm;
