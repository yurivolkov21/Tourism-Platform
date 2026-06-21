import Image from 'next/image';
import Link from 'next/link';
import { ArrowRightIcon } from 'lucide-react';

import { cn } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import type { DestinationTileVM } from '../../lib/destinations.fixtures';

type TileVariant = 'default' | 'feature' | 'photo';

/**
 * Editorial destination tile linking to the destination page. Three variants:
 * - `default` — home bento tile (name + tagline + tour count).
 * - `feature` — overview mosaic lead tile (name + tagline + a "View more" affordance).
 * - `photo` — overview mosaic supporting tile (compact name label only).
 */
export function DestinationTile({
  destination: d,
  className,
  variant = 'default',
}: {
  destination: DestinationTileVM;
  className?: string;
  variant?: TileVariant;
}) {
  const t = messages.destinations;
  const tp = messages.destinationsPage;

  return (
    <Link
      href={`/destinations/${d.slug}`}
      className={cn(
        'group relative block overflow-hidden',
        variant === 'default' && 'aspect-4/3 rounded-xl lg:aspect-auto lg:h-full',
        variant === 'feature' && 'h-full min-h-56',
        variant === 'photo' && 'h-full min-h-40',
        className ?? (variant === 'default' ? d.span : undefined),
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

      {variant === 'photo' ? (
        <div className="text-primary-foreground absolute inset-x-0 bottom-0 p-4">
          <h3 className="font-heading text-lg leading-tight font-semibold">{d.name}</h3>
        </div>
      ) : (
        <div className="text-primary-foreground absolute inset-x-0 bottom-0 flex flex-col gap-1 p-5">
          <h3 className="font-heading text-2xl leading-tight font-semibold">{d.name}</h3>
          <span className="text-primary-foreground/85 text-xs tracking-widest uppercase">
            {d.tagline}
          </span>
          {variant === 'feature' ? (
            <span className="text-primary-foreground mt-2 inline-flex items-center gap-1 text-sm font-medium">
              {tp.viewMore}
              <ArrowRightIcon className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </span>
          ) : (
            <span className="text-primary-foreground/70 text-xs">
              {d.tourCount} {t.toursLabel}
            </span>
          )}
        </div>
      )}
    </Link>
  );
}

export default DestinationTile;
