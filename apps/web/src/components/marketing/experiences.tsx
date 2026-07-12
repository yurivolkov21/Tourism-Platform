import Image from 'next/image';
import {
  ArrowRightIcon,
  LandmarkIcon,
  MountainSnowIcon,
  ShipIcon,
  UsersIcon,
  UtensilsIcon,
  WavesIcon,
  type LucideIcon,
} from 'lucide-react';

import { buttonVariants, cn } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { getSiteMedia } from '../../lib/api/site-media';
import { siteImage } from '../../lib/site-media';
import { SectionHeading } from '../section-heading';

// Icons align by index to messages.experiences.items (TourCategory-shaped).
const icons: LucideIcon[] = [
  ShipIcon,
  MountainSnowIcon,
  LandmarkIcon,
  UtensilsIcon,
  UsersIcon,
  WavesIcon,
];

// Built-in default backdrop — overridable via the `home-experiences` Appearance slot.
const DEFAULT_BG_IMAGE =
  'https://images.unsplash.com/photo-1549797058-00bbab4f7e82?w=1920&q=70&auto=format&fit=crop';

// Theme-led discovery backed by TourCategory — each card links to the filtered tours listing.
export async function Experiences() {
  const t = messages.experiences;
  const bgImage = siteImage(
    await getSiteMedia(),
    'home-experiences',
    DEFAULT_BG_IMAGE,
  );

  return (
    <section
      id="experiences"
      className="relative isolate overflow-hidden py-16 sm:py-20 lg:py-24"
    >
      {/* Atmospheric backdrop + scrim; white cards float on top */}
      <Image
        src={bgImage}
        alt=""
        fill
        sizes="100vw"
        className="-z-10 object-cover"
      />
      <div className="bg-overlay/65 absolute inset-0 -z-10" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title={t.heading}
          subtitle={t.subtitle}
          tone="onMedia"
          className="mb-10 sm:mb-14"
        />

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {t.items.map((item, i) => {
            const Icon = icons[i % icons.length];
            return (
              <a
                key={item.slug}
                href="/tours"
                className="group bg-card shadow-card hover:shadow-dropdown flex items-start gap-4 rounded-xl p-5 transition-all duration-200 ease-out-expo hover:-translate-y-0.5"
              >
                <span className="bg-primary text-primary-foreground flex size-12 shrink-0 items-center justify-center rounded-lg">
                  <Icon className="size-6" />
                </span>
                <div className="space-y-0.5">
                  <h3 className="group-hover:text-primary font-sans font-semibold transition-colors">
                    {item.name}
                  </h3>
                  <p className="text-muted-foreground text-sm text-pretty">
                    {item.description}
                  </p>
                  <span className="text-muted-foreground/80 text-xs">
                    {item.tourCount} {t.toursLabel}
                  </span>
                </div>
                <ArrowRightIcon className="text-primary ml-auto size-4 shrink-0 -translate-x-1 self-center opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100" />
              </a>
            );
          })}
        </div>

        <div className="mt-10 flex justify-center">
          <a
            href="/tours"
            className={cn(
              buttonVariants({ size: 'lg' }),
              'bg-background text-foreground hover:bg-background/90',
            )}
          >
            {t.viewAll}
            <ArrowRightIcon />
          </a>
        </div>
      </div>
    </section>
  );
}

export default Experiences;
