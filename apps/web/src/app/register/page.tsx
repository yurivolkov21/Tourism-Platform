import type { Metadata } from 'next';

import { messages } from '@tourism/i18n';

import { AuthShell } from '../../components/auth/auth-shell';
import { OAuthButtons } from '../../components/auth/oauth-buttons';
import { RegisterForm } from '../../components/auth/register-form';

export const metadata: Metadata = {
  title: messages.auth.register.title,
};

export default function RegisterPage() {
  const t = messages.auth.register;

  return (
    <AuthShell title={t.title} subtitle={t.subtitle}>
      <div className="mb-4">
        <OAuthButtons />
      </div>
      <RegisterForm />
    </AuthShell>
  );
}
