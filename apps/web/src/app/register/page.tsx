import type { Metadata } from 'next';

import { messages } from '@tourism/i18n';

import { AuthShell } from '../../components/auth/auth-shell';
import { RegisterForm } from '../../components/auth/register-form';

export const metadata: Metadata = {
  title: `Create your account — ${messages.brand.name}`,
};

export default function RegisterPage() {
  const t = messages.auth.register;

  return (
    <AuthShell title={t.title} subtitle={t.subtitle}>
      <RegisterForm />
    </AuthShell>
  );
}
