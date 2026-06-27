import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeftIcon, MapPinIcon } from 'lucide-react';

import { messages } from '@tourism/i18n';

import { Logo } from '../brand/logo';

// A real destination from the catalog (same Hạ Long shot the site uses elsewhere) — the auth screen
// opens on the product's own world, not a stock login illustration.
const PANEL_IMAGE =
  'https://images.unsplash.com/photo-1528127269322-539801943592?w=1200&q=75&auto=format&fit=crop';

/**
 * Split auth layout shared by login / register / forgot / reset. Left: a full-bleed Hạ Long Bay panel
 * with an emerald scrim, the brand, and an editorial place caption that ties the screen to the
 * catalogue. Right: an ivory form column. On mobile the panel collapses to a slim photo band above
 * the form. API is unchanged (`title` / `subtitle` / `children`) so the pages need no edits.
 */
export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <main className="relative grid min-h-svh lg:grid-cols-[1.05fr_1fr]">
      {/* Back to home — the auth screens render without the navbar, so this is the way out. */}
      <Link
        href="/"
        className="absolute top-5 left-5 z-10 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/25 lg:text-white"
      >
        <ArrowLeftIcon className="size-4" />
        {messages.auth.backHome}
      </Link>

      {/* Visual panel — full height on lg, slim band on mobile. */}
      <aside className="relative h-44 overflow-hidden lg:h-auto">
        <Image
          src={PANEL_IMAGE}
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) 52vw, 100vw"
          className="object-cover"
        />
        <div className="from-primary/85 via-primary/35 to-foreground/70 absolute inset-0 bg-linear-to-br" />

        <div className="relative flex h-full flex-col justify-between p-6 lg:p-10">
          <span className="inline-flex items-baseline gap-2 text-white">
            <span className="font-sans text-2xl font-extrabold tracking-[-0.045em]">NEX</span>
            <span className="font-heading text-lg font-semibold">Nexora</span>
          </span>

          <div className="hidden space-y-4 text-white lg:block">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-sm">
              <MapPinIcon className="size-3.5" />
              Hạ Long Bay · Northern Vietnam
            </span>
            <h2 className="font-heading max-w-sm text-3xl font-semibold text-balance">
              Heritage journeys, thoughtfully planned.
            </h2>
            <p className="max-w-sm text-sm text-pretty text-white/80">
              Your account keeps your trips, bookings and saved destinations across Vietnam in one place.
            </p>
          </div>
        </div>
      </aside>

      {/* Form column. */}
      <section className="bg-background flex items-center justify-center px-4 py-10 sm:px-6 lg:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center lg:hidden">
            <Logo />
          </div>
          <div className="mb-6 space-y-1 text-center lg:text-left">
            <h1 className="font-heading text-2xl font-semibold sm:text-3xl">{title}</h1>
            <p className="text-muted-foreground text-sm text-pretty">{subtitle}</p>
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}

export default AuthShell;
