'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { Button, toast } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { saveProfile } from '../../lib/account/actions';
import { buildUpdateProfilePayload } from '../../lib/account/profile-form';
import { createClient } from '../../lib/supabase/client';
import { AuthFormField } from '../auth/auth-form-field';

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
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);

    const form = new FormData(event.currentTarget);
    const payload = buildUpdateProfilePayload({
      fullName: String(form.get('fullName') ?? ''),
      phone: String(form.get('phone') ?? ''),
    });

    const result = await saveProfile(payload);
    if (result.error) {
      toast.error(result.error);
      setPending(false);
      return;
    }

    // Mirror the name into Supabase metadata so the navbar (AuthProvider) updates live.
    await createClient()
      .auth.updateUser({ data: { full_name: payload.fullName ?? '' } })
      .catch(() => {
        // Best-effort navbar sync; the API profile is already saved.
      });

    toast.success(t.saved);
    setPending(false);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <AuthFormField
        id="fullName"
        label={t.fullNameLabel}
        name="fullName"
        autoComplete="name"
        defaultValue={fullName}
      />

      <AuthFormField
        id="phone"
        label={t.phoneLabel}
        name="phone"
        type="tel"
        autoComplete="tel"
        defaultValue={phone}
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

      <Button type="submit" disabled={pending}>
        {pending ? t.saving : t.save}
      </Button>
    </form>
  );
}

export default ProfileForm;
