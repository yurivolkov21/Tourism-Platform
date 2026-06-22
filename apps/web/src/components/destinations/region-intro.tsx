import Image from 'next/image';
import Link from 'next/link';
import { PlayIcon } from 'lucide-react';

import { buttonVariants, cn } from '@tourism/ui';
import { messages } from '@tourism/i18n';

/** Region intro: heading + accent + video slot + copy + itineraries CTA on the left, collage right. */
export function RegionIntro({
  name,
  intro,
  images,
  itinerariesHref,
}: {
  name: string;
  intro: string;
  images: string[];
  itinerariesHref: string;
}) {
  const t = messages.regionPage;
  const collage = images.slice(0, 4);

  return (
    <section className="py-14 sm:py-20">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
        {/* Left: heading + accent + video slot + text + CTA */}
        <div className="space-y-5">
          <h2 className="font-heading text-2xl font-semibold text-balance md:text-3xl">
            {t.introHeading(name)}
          </h2>
          <div className="bg-primary h-1 w-12 rounded-full" />

          {/* Video slot — static poster + play affordance (real embed later) */}
          <div className="bg-foreground/90 relative aspect-video overflow-hidden rounded-xl">
            {images[0] ? (
              <Image
                src={images[0]}
                alt=""
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover opacity-80"
              />
            ) : null}
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="bg-background/90 text-primary flex size-14 items-center justify-center rounded-full">
                <PlayIcon className="size-6" />
              </span>
            </span>
          </div>

          <p className="text-muted-foreground text-lg text-pretty">{intro}</p>
          <Link href={itinerariesHref} className={cn(buttonVariants({ size: 'lg' }))}>
            {t.itinerariesCta(name)}
          </Link>
        </div>

        {/* Right: 2×2 photo collage */}
        <div className="grid grid-cols-2 gap-4">
          {collage.map((src, i) => (
            <div key={i} className="relative aspect-square overflow-hidden rounded-xl">
              <Image
                src={src}
                alt=""
                fill
                sizes="(min-width: 1024px) 25vw, 50vw"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default RegionIntro;
