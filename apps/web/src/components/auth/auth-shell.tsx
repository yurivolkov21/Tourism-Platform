import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeftIcon, MapPinIcon } from 'lucide-react';

import { AnimatedGridPattern, Card, CardContent } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { Logo } from '../brand/logo';

import { getSiteMedia } from '../../lib/api/site-media';
import { siteImage } from '../../lib/site-media';

// Built-in default (same Hạ Long shot the site uses elsewhere) — overridable via the
// `auth-panel` Appearance slot; the auth screen opens on the product's own world.
const DEFAULT_PANEL_IMAGE =
  'https://images.unsplash.com/photo-1462688681110-15bc88b1497c?w=1920&q=70&auto=format&fit=crop';

/**
 * Split auth layout shared by login / register / forgot / reset. Left: a full-bleed Hạ Long Bay panel
 * with an emerald scrim, the brand, and an editorial place caption that ties the screen to the
 * catalogue. Right: an ivory form column. On mobile the panel collapses to a slim photo band above
 * the form. API is unchanged (`title` / `subtitle` / `children`) so the pages need no edits.
 */
export async function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const panelImage = siteImage(
    await getSiteMedia(),
    'auth-panel',
    DEFAULT_PANEL_IMAGE,
  );
  return (
    <main className="grid min-h-svh lg:grid-cols-[1.05fr_1fr]">
      {/* Visual panel — full height on lg, slim band on mobile. */}
      <aside className="relative h-44 overflow-hidden lg:h-auto">
        <Image
          src={panelImage}
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) 52vw, 100vw"
          className="object-cover"
        />
        <div className="from-primary/85 via-primary/35 to-foreground/70 absolute inset-0 bg-linear-to-br" />

        <div className="relative flex h-full flex-col justify-between p-6 lg:p-10">
          {/* The panel sits on a photo + dark scrim in both themes, so the fold tone is
              pinned to white rather than the theme-following `--background` the footer uses. */}
          <Link
            href="/"
            aria-label={messages.brand.name}
            className="self-start"
          >
            <Logo className="[--nx-tone:var(--color-white)]" />
          </Link>

          <div className="hidden space-y-4 text-white lg:block">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-sm">
              <MapPinIcon className="size-3.5" />
              Hạ Long Bay · Northern Vietnam
            </span>
            <h2 className="font-heading max-w-sm text-3xl font-semibold text-balance">
              Heritage journeys, thoughtfully planned.
            </h2>
            <p className="max-w-sm text-sm text-pretty text-white/80">
              Your account keeps your trips, bookings and saved destinations
              across Vietnam in one place.
            </p>
          </div>
        </div>
      </aside>

      {/* Form column — animated grid backdrop with the form lifted into a card. */}
      <section className="bg-background relative flex items-center justify-center overflow-hidden px-4 py-10 sm:px-6 lg:px-10">
        <AnimatedGridPattern
          numSquares={28}
          maxOpacity={0.18}
          duration={3}
          className="stroke-primary/15 text-primary/25 motion-reduce:hidden inset-y-[-30%] h-[160%] skew-y-12 mask-[radial-gradient(440px_circle_at_center,white,transparent)]"
        />
        <Card className="shadow-card relative z-10 w-full max-w-md">
          <CardContent className="p-6 sm:p-8">
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1.5 text-sm transition-colors"
            >
              <ArrowLeftIcon className="size-4" />
              {messages.auth.backHome}
            </Link>
            <div className="mb-6 space-y-1">
              <h1 className="font-heading text-2xl font-semibold sm:text-3xl">
                {title}
              </h1>
              <p className="text-muted-foreground text-sm text-pretty">
                {subtitle}
              </p>
            </div>
            {children}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

export default AuthShell;
