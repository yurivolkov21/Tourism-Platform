import Image from 'next/image';
import Link from 'next/link';
import { ChevronRightIcon } from 'lucide-react';

import { cn } from '@tourism/ui';
import { messages } from '@tourism/i18n';

/** Region-page hero: full-bleed cover + scrim + breadcrumb + region name + tagline (left-aligned).
 * `heightClass` and `scrimClass` carry the per-region mood. */
export function RegionHero({
  name,
  image,
  tagline,
  heightClass = 'min-h-80 lg:min-h-96',
  scrimClass = 'from-overlay/80 via-overlay/40 to-transparent',
}: {
  name: string;
  image: string;
  tagline: string;
  heightClass?: string;
  scrimClass?: string;
}) {
  return (
    <section className={cn('relative isolate flex items-end overflow-hidden', heightClass)}>
      <Image src={image} alt={name} fill priority sizes="100vw" className="-z-10 object-cover" />
      <div className={cn('absolute inset-0 -z-10 bg-linear-to-t', scrimClass)} />

      <div className="text-on-media mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <nav
          aria-label="Breadcrumb"
          className="text-on-media/80 mb-3 flex items-center gap-1.5 text-sm"
        >
          <Link href="/" className="hover:text-on-media">
            {messages.common.home}
          </Link>
          <ChevronRightIcon className="size-4" />
          <Link href="/destinations" className="hover:text-on-media">
            {messages.nav.destinations}
          </Link>
          <ChevronRightIcon className="size-4" />
          <span>{name}</span>
        </nav>
        <h1 className="text-4xl leading-tight font-bold text-balance sm:text-5xl lg:text-6xl">
          {name}
        </h1>
        <p className="text-on-media/85 mt-3 max-w-xl text-lg text-pretty">{tagline}</p>
      </div>
    </section>
  );
}

export default RegionHero;
