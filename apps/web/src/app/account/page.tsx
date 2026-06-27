import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { TicketIcon } from 'lucide-react';

import { messages } from '@tourism/i18n';

import { SignOutButton } from '../../components/auth/sign-out-button';
import { createClient } from '../../lib/supabase/server';

export const metadata: Metadata = {
  title: `My account — ${messages.brand.name}`,
};

/**
 * Protected account stub. The proxy already gates `/account*`, but we re-check here (defence in depth)
 * and read the user for display. Real account content (profile · my bookings · wishlist) is the next
 * increment.
 */
export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login?redirect=/account');

  const t = messages.auth.account;

  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="font-heading text-3xl font-semibold">{t.title}</h1>

      <div className="bg-card shadow-card mt-6 rounded-xl border p-6">
        <p className="text-muted-foreground text-sm">{t.signedInAs}</p>
        <p className="font-medium">{user.email}</p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            href="/account/bookings"
            className="border-primary/30 text-primary hover:bg-primary/5 inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
          >
            <TicketIcon className="size-4" />
            {messages.booking.list.menuLink}
          </Link>
          <SignOutButton />
        </div>
      </div>
    </main>
  );
}
