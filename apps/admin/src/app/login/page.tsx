import { Logo } from '../../components/brand/logo';
import { LoginBackdrop } from '../../components/auth/login-backdrop';
import { LoginForm } from '../../components/auth/login-form';
import { safeRedirect } from '../../lib/auth/safe-redirect';

export const metadata = { title: 'Sign in — Nexora Console' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const params = await searchParams;
  const redirectTo = safeRedirect(params.redirect, '/');

  return (
    // `dark` is forced here: the sign-in screen is its own dark surface regardless
    // of the admin app's light/dark theme.
    <main className="dark text-foreground relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <LoginBackdrop />

      <section className="relative z-10 w-full max-w-sm">
        <div className="border-border/40 bg-card/70 ring-primary/10 rounded-2xl border p-8 shadow-2xl ring-1 backdrop-blur-xl">
          {/* Brand lockup — shared Nexora wordmark (same fold mark as the web app). */}
          <div className="mb-7 flex flex-col items-center text-center">
            <Logo className="text-[1.7rem]" />
            <span className="text-primary/80 mt-2 text-[0.7rem] font-semibold tracking-[0.18em] uppercase">
              Operations Console
            </span>
          </div>

          <div className="mb-6 space-y-1.5 text-center">
            <h1 className="font-heading text-2xl font-semibold">
              Sign in to the console
            </h1>
            <p className="text-muted-foreground text-sm">
              Manage tours, bookings, and content.
            </p>
          </div>

          <LoginForm redirectTo={redirectTo} />
        </div>

        <p className="text-muted-foreground/80 mt-5 text-center text-xs">
          Access is restricted to authorized staff accounts.
        </p>
      </section>
    </main>
  );
}
