import type { Metadata } from 'next';

import { messages } from '@tourism/i18n';

import { AuthShell } from '../../components/auth/auth-shell';
import { LoginForm } from '../../components/auth/login-form';
import { OAuthButtons } from '../../components/auth/oauth-buttons';
import { safeRedirect } from '../../lib/auth/safe-redirect';

export const metadata: Metadata = {
  title: 'Sign in',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const redirectTo = safeRedirect(sp.redirect, '/account');
  const t = messages.auth.login;

  return (
    <AuthShell title={t.title} subtitle={t.subtitle}>
      {sp.error ? (
        <p className="text-destructive mb-4 text-center text-sm" role="alert">
          We couldn&apos;t confirm your link. Please sign in or try again.
        </p>
      ) : null}
      <div className="mb-4">
        <OAuthButtons redirectTo={redirectTo} />
      </div>
      <LoginForm redirectTo={redirectTo} />
    </AuthShell>
  );
}
