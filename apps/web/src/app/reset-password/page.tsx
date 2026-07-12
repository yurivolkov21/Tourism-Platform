import type { Metadata } from 'next';
import Link from 'next/link';

import { messages } from '@tourism/i18n';

import { AuthShell } from '../../components/auth/auth-shell';
import { ResetPasswordForm } from '../../components/auth/reset-password-form';
import { createClient } from '../../lib/supabase/server';

export const metadata: Metadata = {
  title: messages.auth.reset.title,
};

// Reached via a recovery session (the callback exchanges the link's code first). Per-user → dynamic.
export const dynamic = 'force-dynamic';

export default async function ResetPasswordPage() {
  const t = messages.auth.reset;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <AuthShell title={t.invalidTitle} subtitle={t.invalidBody}>
        <div className="text-center">
          <Link
            href="/forgot-password"
            className="text-primary font-medium hover:underline"
          >
            {t.requestNew}
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={t.title} subtitle={t.subtitle}>
      <ResetPasswordForm />
    </AuthShell>
  );
}
