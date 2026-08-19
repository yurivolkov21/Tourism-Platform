import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeftIcon } from 'lucide-react';

import { messages } from '@tourism/i18n';

import {
  AccountSection,
  AccountSectionRow,
} from '../../../components/account/account-section';
import { AvatarUploader } from '../../../components/account/avatar-uploader';
import { ChangeEmailForm } from '../../../components/account/change-email-form';
import { ChangePasswordForm } from '../../../components/account/change-password-form';
import { ConnectedAccounts } from '../../../components/account/connected-accounts';
import { DangerZone } from '../../../components/account/danger-zone';
import { ProfileForm } from '../../../components/account/profile-form';
import { fetchProfile } from '../../../lib/api/profile';
import { canChangeEmail } from '../../../lib/auth/can-change-email';
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
        <AccountSection
          id="personal"
          title={t.personalHeading}
          description={t.personalDesc}
        >
          <AccountSectionRow title={t.photoHeading}>
            <AvatarUploader
              initialUrl={profile?.avatarUrl ?? null}
              name={profile?.fullName ?? user.email ?? ''}
            />
          </AccountSectionRow>

          <AccountSectionRow title={t.detailsHeading}>
            <ProfileForm
              email={profile?.email ?? user.email ?? ''}
              fullName={profile?.fullName ?? ''}
              phone={profile?.phone ?? ''}
            />
          </AccountSectionRow>
        </AccountSection>

        <AccountSection
          id="security"
          title={t.securityHeading}
          description={t.securityDesc}
        >
          <AccountSectionRow title={t.emailHeading}>
            {canChangeEmail(providers) ? (
              <ChangeEmailForm currentEmail={user.email ?? ''} />
            ) : (
              <p className="text-muted-foreground text-sm text-pretty">
                {messages.auth.account.securityPage.email.managedNote}
              </p>
            )}
          </AccountSectionRow>

          <AccountSectionRow title={t.passwordHeading}>
            <ChangePasswordForm />
          </AccountSectionRow>
        </AccountSection>

        <AccountSection
          id="connected"
          title={t.connectedHeading}
          description={t.connectedDesc}
        >
          <AccountSectionRow>
            <ConnectedAccounts providers={providers} />
          </AccountSectionRow>
        </AccountSection>

        <AccountSection
          id="danger"
          title={t.dangerHeading}
          description={t.dangerDesc}
          tone="danger"
        >
          <AccountSectionRow>
            <DangerZone />
          </AccountSectionRow>
        </AccountSection>
      </div>
    </main>
  );
}
