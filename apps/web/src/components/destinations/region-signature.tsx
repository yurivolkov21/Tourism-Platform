import Image from 'next/image';

import { cn } from '@tourism/ui';

import type { SignatureVariant } from '../../lib/region-theme';

/**
 * Per-region signature band — one editorial feature that gives each region its own identity.
 * The `variant` flips the image side (and could carry more flair later); accent is per-region.
 */
export function RegionSignature({
  variant,
  eyebrow,
  heading,
  body,
  points,
  image,
  accentText,
  accentBg,
}: {
  variant: SignatureVariant;
  eyebrow: string;
  heading: string;
  body: string;
  points: string[];
  image: string;
  accentText: string;
  accentBg: string;
}) {
  // Heritage reads left-to-right (image left); adventure & delta lead with the copy (image right).
  const imageRight = variant !== 'heritage';

  return (
    <section className="bg-muted/40 py-16 sm:py-24">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-8">
        <div
          className={cn(
            'relative aspect-4/3 overflow-hidden rounded-2xl',
            imageRight ? 'lg:order-2' : 'lg:order-1',
          )}
        >
          {image ? (
            <Image
              src={image}
              alt={heading}
              fill
              sizes="(min-width:1024px) 50vw, 100vw"
              className="object-cover"
            />
          ) : null}
        </div>

        <div
          className={cn('space-y-5', imageRight ? 'lg:order-1' : 'lg:order-2')}
        >
          <span
            className={cn(
              'text-xs font-semibold tracking-widest uppercase',
              accentText,
            )}
          >
            {eyebrow}
          </span>
          <h2 className="font-heading text-3xl font-semibold text-balance md:text-4xl">
            {heading}
          </h2>
          <p className="text-muted-foreground text-lg text-pretty">{body}</p>
          <ul className="space-y-3">
            {points.map((point) => (
              <li key={point} className="flex items-start gap-3">
                <span
                  className={cn('mt-2 size-2 shrink-0 rounded-full', accentBg)}
                />
                <span className="text-foreground text-pretty">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export default RegionSignature;
