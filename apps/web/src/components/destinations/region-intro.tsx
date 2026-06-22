import Link from 'next/link';
import { ArrowRightIcon } from 'lucide-react';

import { cn } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { Tile } from '../marketing/gallery';

/**
 * Region intro: fuller editorial copy + "best for" tags + a themed itineraries CTA on the left,
 * and an asymmetric photo bento on the right (reuses the Gallery `Tile`). Accent is per-region.
 */
export function RegionIntro({
  name,
  intro,
  intro2,
  tags,
  images,
  itinerariesHref,
  accentBg,
  accentBtnText,
}: {
  name: string;
  intro: string;
  intro2: string;
  tags: string[];
  images: string[];
  itinerariesHref: string;
  accentBg: string;
  accentBtnText: string;
}) {
  const t = messages.regionPage;

  return (
    <section className="py-14 sm:py-20">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-8">
        {/* Left: heading + accent + copy + tags + CTA */}
        <div className="space-y-5">
          <h2 className="font-heading text-2xl font-semibold text-balance md:text-3xl">
            {t.introHeading(name)}
          </h2>
          <div className={cn('h-1 w-12 rounded-full', accentBg)} />

          <p className="text-muted-foreground text-lg text-pretty">{intro}</p>
          <p className="text-muted-foreground text-pretty">{intro2}</p>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-foreground text-sm font-medium">{t.bestForLabel}:</span>
            {tags.map((tag) => (
              <span
                key={tag}
                className="border-border text-muted-foreground rounded-full border px-3 py-1 text-xs"
              >
                {tag}
              </span>
            ))}
          </div>

          <Link
            href={itinerariesHref}
            className={cn(
              'mt-1 inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90',
              accentBg,
              accentBtnText,
            )}
          >
            {t.itinerariesCta(name)}
            <ArrowRightIcon className="size-4" />
          </Link>
        </div>

        {/* Right: feature + 2 stacked — one tall image left, two stacked right (clean, no repeats) */}
        <div className="grid h-96 grid-cols-2 grid-rows-2 gap-3 sm:gap-4">
          <Tile image={{ src: images[0], alt: name }} className="row-span-2 h-full" />
          <Tile image={{ src: images[1], alt: name }} className="h-full" />
          <Tile image={{ src: images[2], alt: name }} className="h-full" />
        </div>
      </div>
    </section>
  );
}

export default RegionIntro;
