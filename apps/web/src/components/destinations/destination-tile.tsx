import Image from 'next/image';
import Link from 'next/link';
import { ArrowRightIcon } from 'lucide-react';

import { cn } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import type { DestinationTileVM } from '../../lib/destinations.fixtures';
import { slugify } from '../../lib/slug';
import { GlareLayer } from './glare-layer';

type TileVariant = 'default' | 'feature' | 'photo';

/**
 * Editorial destination tile linking to its region page (destination pre-selected via `?d=`).
 * Three variants:
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
      href={`/destinations/${slugify(d.region ?? '')}?d=${d.slug}`}
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
      {/* Scrim — bottom gradient for the home bento; a centred wash (deepens on hover) for the
          overview mosaic tiles so the centred caption stays legible over any photo. */}
      {variant === 'default' ? (
        <div className="from-overlay absolute inset-0 bg-linear-to-t to-transparent" />
      ) : (
        <div className="bg-overlay/25 absolute inset-0 transition-colors duration-500 group-hover:bg-overlay/55" />
      )}

      {/* Light-sweep on hover (home bento only); above photo, below caption, clicks pass through */}
      {variant === 'default' && <GlareLayer />}

      {variant === 'photo' ? (
        <div className="text-on-media absolute inset-0 flex flex-col items-center justify-center p-4 text-center [text-shadow:0_1px_4px_rgb(0_0_0/0.55)]">
          <h3 className="font-heading text-lg leading-tight font-semibold">{d.name}</h3>
          {/* Tagline + affordance lift in on hover/focus; reduced-motion = instant. */}
          <div className="grid grid-rows-[0fr] opacity-0 transition-all duration-300 ease-out-expo group-hover:grid-rows-[1fr] group-hover:opacity-100 group-focus-visible:grid-rows-[1fr] group-focus-visible:opacity-100 motion-reduce:transition-none">
            <div className="flex min-h-0 flex-col items-center gap-1 overflow-hidden pt-2">
              <span className="text-on-media/90 text-[0.7rem] tracking-widest uppercase">
                {d.tagline}
              </span>
              <span className="text-on-media inline-flex items-center gap-1 text-sm font-medium">
                {tp.viewMore}
                <ArrowRightIcon className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </span>
            </div>
          </div>
        </div>
      ) : variant === 'feature' ? (
        <div className="text-on-media absolute inset-0 flex flex-col items-center justify-center p-5 text-center [text-shadow:0_1px_4px_rgb(0_0_0/0.55)]">
          <h3 className="font-heading text-2xl leading-tight font-semibold">{d.name}</h3>
          {/* Tagline + affordance lift in on hover/focus (centred, Lily-style) */}
          <div className="grid grid-rows-[0fr] opacity-0 transition-all duration-300 ease-out-expo group-hover:grid-rows-[1fr] group-hover:opacity-100 group-focus-visible:grid-rows-[1fr] group-focus-visible:opacity-100 motion-reduce:transition-none">
            <div className="flex min-h-0 flex-col items-center gap-1 overflow-hidden pt-2">
              <span className="text-on-media/90 text-xs tracking-widest uppercase">
                {d.tagline}
              </span>
              <span className="text-on-media inline-flex items-center gap-1 text-sm font-medium">
                {tp.viewMore}
                <ArrowRightIcon className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-on-media absolute inset-x-0 bottom-0 flex flex-col gap-1 p-5">
          <h3 className="font-heading text-2xl leading-tight font-semibold">{d.name}</h3>
          <span className="text-on-media/85 text-xs tracking-widest uppercase">
            {d.tagline}
          </span>
          <span className="text-on-media/70 text-xs">
            {d.tourCount} {t.toursLabel}
          </span>
        </div>
      )}
    </Link>
  );
}

export default DestinationTile;
