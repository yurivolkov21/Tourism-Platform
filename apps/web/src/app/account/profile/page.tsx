import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeftIcon } from 'lucide-react';

import { Separator } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { AccountSection } from '../../../components/account/account-section';
import { AvatarUploader } from '../../../components/account/avatar-uploader';
import { ChangeEmailForm } from '../../../components/account/change-email-form';
import { ChangePasswordForm } from '../../../components/account/change-password-form';
import { ConnectedAccounts } from '../../../components/account/connected-accounts';
import { DangerZone } from '../../../components/account/danger-zone';
import { ProfileForm } from '../../../components/account/profile-form';
import { fetchProfile } from '../../../lib/api/profile';
import { createClient } from '../../../lib/supabase/server';

export const metadata: Metadata = {
  title: messages.auth.account.settings.title,
};

export const dynamic = 'force-dynamic';

/** Read the linked sign-in providers from the Supabase user (Google OAuth, email/password, …). */
function readProviders(
  appMetadata: Record<string, unknown> | undefined,
): string[] {
  const list = appMetadata?.['providers'];
  if (Array.isArray(list))
    return list.filter((p): p is string => typeof p === 'string');
  const single = appMetadata?.['provider'];
  return typeof single === 'string' ? [single] : [];
}

export default async function AccountSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/account/profile');

  const profile = await fetchProfile();
  const t = messages.auth.account.settings;
  const providers = readProviders(user.app_metadata);

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <Link
        href="/account"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeftIcon className="size-4" />
        {messages.auth.account.profile.back}
      </Link>

      <header className="mt-4 mb-2">
        <h1 className="font-heading text-3xl font-semibold">{t.title}</h1>
        <p className="text-muted-foreground mt-2">{t.subtitle}</p>
      </header>

      <div className="divide-y">
        <AccountSection title={t.personalHeading} description={t.personalDesc}>
          <div className="space-y-6">
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
        </AccountSection>

        <AccountSection title={t.securityHeading} description={t.securityDesc}>
          <div className="space-y-8">
            <ChangeEmailForm currentEmail={user.email ?? ''} />
            <Separator />
            <ChangePasswordForm />
          </div>
        </AccountSection>

        <AccountSection
          title={t.connectedHeading}
          description={t.connectedDesc}
        >
          <ConnectedAccounts providers={providers} />
        </AccountSection>

        <AccountSection title={t.dangerHeading} description={t.dangerDesc}>
          <DangerZone />
        </AccountSection>
      </div>
    </main>
  );
}
