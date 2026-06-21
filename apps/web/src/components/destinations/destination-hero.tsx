import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeftIcon, MapPinIcon } from 'lucide-react';

import { messages } from '@tourism/i18n';

import type { DestinationTileVM } from '../../lib/destinations.fixtures';

/** Detail hero: full-bleed cover + destination name + region/country label + back link. */
export function DestinationHero({ destination: d }: { destination: DestinationTileVM }) {
  return (
    <section className="relative isolate flex min-h-96 items-end overflow-hidden lg:min-h-120">
      <Image
        src={d.image}
        alt={d.name}
        fill
        priority
        sizes="100vw"
        className="-z-10 object-cover"
      />
      <div className="from-overlay/80 absolute inset-0 -z-10 bg-linear-to-t to-transparent" />

      <div className="text-primary-foreground mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <Link
          href="/destinations"
          className="text-primary-foreground/80 hover:text-primary-foreground mb-4 inline-flex items-center gap-1 text-sm font-medium"
        >
          <ChevronLeftIcon className="size-4" />
          {messages.destinationDetail.backToAll}
        </Link>
        <h1 className="text-4xl leading-tight font-bold text-balance sm:text-5xl lg:text-6xl">
          {d.name}
        </h1>
        <span className="text-primary-foreground/85 mt-3 inline-flex items-center gap-1.5 text-sm tracking-widest uppercase">
          <MapPinIcon className="size-4" />
          {d.region ?? d.country}
        </span>
      </div>
    </section>
  );
}

export default DestinationHero;
