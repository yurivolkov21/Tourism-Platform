import Image from 'next/image';
import Link from 'next/link';

import { cn } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import type { DestinationTileVM } from '../../lib/destinations.fixtures';

/**
 * Editorial destination tile: cover image + scrim + name + tagline + tour count, linking to the
 * destination page. Shared by the home teaser (bento via `destination.span`) and the
 * `/destinations` overview (uniform via an explicit `className`).
 */
export function DestinationTile({
  destination: d,
  className,
}: {
  destination: DestinationTileVM;
  className?: string;
}) {
  const t = messages.destinations;

  return (
    <Link
      href={`/destinations/${d.slug}`}
      className={cn(
        'group relative block aspect-4/3 overflow-hidden rounded-xl lg:aspect-auto lg:h-full',
        className ?? d.span,
      )}
    >
      <Image
        src={d.image}
        alt={d.name}
        fill
        sizes="(min-width: 1024px) 50vw, 50vw"
        className="object-cover transition-transform duration-500 ease-out-expo group-hover:scale-105"
      />
      {/* Scrim for legibility */}
      <div className="from-overlay absolute inset-0 bg-linear-to-t to-transparent" />
      {/* Label */}
      <div className="text-primary-foreground absolute inset-x-0 bottom-0 flex flex-col gap-1 p-5">
        <h3 className="font-heading text-2xl leading-tight font-semibold">{d.name}</h3>
        <span className="text-primary-foreground/85 text-xs tracking-widest uppercase">
          {d.tagline}
        </span>
        <span className="text-primary-foreground/70 text-xs">
          {d.tourCount} {t.toursLabel}
        </span>
      </div>
    </Link>
  );
}

export default DestinationTile;
