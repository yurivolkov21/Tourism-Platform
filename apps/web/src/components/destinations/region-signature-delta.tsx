import Image from 'next/image';

import { cn } from '@tourism/ui';

/**
 * Delta signature (Southern Vietnam) — image-led "postcards" in a staggered row on a teal-tinted
 * band, distinct from the dark adventure-stats band and the text timeline. Photo-forward + teal accent.
 */
export function RegionSignatureDelta({
  eyebrow,
  heading,
  body,
  postcards,
  images,
}: {
  eyebrow: string;
  heading: string;
  body: string;
  postcards: { title: string; caption: string }[];
  images: string[];
}) {
  return (
    <section className="bg-info/5 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl space-y-4">
          <span className="text-info text-xs font-semibold tracking-widest uppercase">
            {eyebrow}
          </span>
          <h2 className="font-heading text-3xl font-semibold text-balance sm:text-4xl lg:text-5xl">
            {heading}
          </h2>
          <p className="text-muted-foreground text-lg text-pretty">{body}</p>
        </div>

        <div className="mt-12 grid gap-5 sm:mt-16 sm:grid-cols-3 sm:gap-6">
          {postcards.map((card, i) => (
            <figure
              key={card.title}
              className={cn(
                'group text-on-media shadow-card relative aspect-4/5 overflow-hidden rounded-2xl',
                // Gentle stagger: the outer cards drop, the middle one lifts.
                i === 1 ? 'sm:-translate-y-4' : 'sm:translate-y-4',
              )}
            >
              <Image
                src={images[i] ?? images[0] ?? ''}
                alt={card.title}
                fill
                sizes="(min-width: 640px) 33vw, 100vw"
                className="object-cover transition-transform duration-500 ease-out-expo group-hover:scale-105"
              />
              <div className="from-overlay via-overlay/25 absolute inset-0 bg-linear-to-t to-transparent" />
              <figcaption className="absolute inset-x-0 bottom-0 p-5">
                <span className="bg-info mb-2 block h-1 w-9 rounded-full" />
                <p className="text-on-media/80 text-xs font-semibold tracking-widest uppercase">
                  {card.caption}
                </p>
                <h3 className="font-heading text-xl font-semibold text-balance">{card.title}</h3>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

export default RegionSignatureDelta;
