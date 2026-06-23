import { LoginForm } from '../../components/auth/login-form';
import { safeRedirect } from '../../lib/auth/safe-redirect';

export const metadata = { title: 'Sign in — Tourism Admin' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const params = await searchParams;
  const redirectTo = safeRedirect(params.redirect, '/');

  return (
    <main className="bg-muted/30 flex min-h-screen items-center justify-center p-4">
      <div className="bg-card ring-border/60 shadow-card w-full max-w-sm rounded-xl p-8 ring-1">
        <div className="mb-6 space-y-1.5 text-center">
          <h1 className="font-heading text-2xl font-bold">Tourism Admin</h1>
          <p className="text-muted-foreground text-sm">Sign in to the admin console.</p>
        </div>
        <LoginForm redirectTo={redirectTo} />
      </div>
    </main>
  );
}
