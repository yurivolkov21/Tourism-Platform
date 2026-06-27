import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeftIcon } from 'lucide-react';

import { messages } from '@tourism/i18n';

import { AvatarUploader } from '../../../components/account/avatar-uploader';
import { ProfileForm } from '../../../components/account/profile-form';
import { fetchProfile } from '../../../lib/api/profile';
import { createClient } from '../../../lib/supabase/server';

export const metadata: Metadata = {
  title: `${messages.auth.account.profile.title} — ${messages.brand.name}`,
};

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/account/profile');

  const profile = await fetchProfile();
  const t = messages.auth.account.profile;

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <Link
        href="/account"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeftIcon className="size-4" />
        {t.back}
      </Link>

      <header className="mt-4 mb-8">
        <h1 className="font-heading text-3xl font-semibold">{t.title}</h1>
        <p className="text-muted-foreground mt-2">{t.subtitle}</p>
      </header>

      <div className="bg-card shadow-card space-y-6 rounded-xl border p-6">
        <AvatarUploader
          initialUrl={profile?.avatarUrl ?? null}
          name={profile?.fullName ?? user.email ?? ''}
        />
        <ProfileForm
          email={profile?.email ?? user.email ?? ''}
          fullName={profile?.fullName ?? ''}
          phone={profile?.phone ?? ''}
        />
      </div>
    </main>
  );
}
