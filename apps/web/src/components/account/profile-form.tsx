'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { Button, Input, Label, toast } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { saveProfile } from '../../lib/account/actions';
import { buildUpdateProfilePayload } from '../../lib/account/profile-form';
import { createClient } from '../../lib/supabase/client';

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
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="fullName">{t.fullNameLabel}</Label>
        <Input
          id="fullName"
          name="fullName"
          autoComplete="name"
          defaultValue={fullName}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="phone">{t.phoneLabel}</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          defaultValue={phone}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">{t.emailLabel}</Label>
        <Input id="email" type="email" value={email} disabled readOnly />
        <p className="text-muted-foreground text-xs">{t.emailHint}</p>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? t.saving : t.save}
      </Button>
    </form>
  );
}

export default ProfileForm;
