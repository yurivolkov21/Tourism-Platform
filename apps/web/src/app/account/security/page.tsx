import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeftIcon } from 'lucide-react';

import { Separator } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { ChangeEmailForm } from '../../../components/account/change-email-form';
import { ChangePasswordForm } from '../../../components/account/change-password-form';
import { createClient } from '../../../lib/supabase/server';

export const metadata: Metadata = {
  title: `${messages.auth.account.securityPage.title} — ${messages.brand.name}`,
};

export const dynamic = 'force-dynamic';

export default async function AccountSecurityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/account/security');

  const t = messages.auth.account.securityPage;

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

      <div className="bg-card shadow-card space-y-8 rounded-xl border p-6">
        <ChangePasswordForm />
        <Separator />
        <ChangeEmailForm currentEmail={user.email ?? ''} />
      </div>
    </main>
  );
}
