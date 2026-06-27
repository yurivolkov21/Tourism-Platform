import type { Metadata } from 'next';

import { messages } from '@tourism/i18n';

import { AuthShell } from '../../components/auth/auth-shell';
import { ForgotPasswordForm } from '../../components/auth/forgot-password-form';

export const metadata: Metadata = {
  title: `${messages.auth.forgot.title} — ${messages.brand.name}`,
};

export default function ForgotPasswordPage() {
  const t = messages.auth.forgot;
  return (
    <AuthShell title={t.title} subtitle={t.subtitle}>
      <ForgotPasswordForm />
    </AuthShell>
  );
}
