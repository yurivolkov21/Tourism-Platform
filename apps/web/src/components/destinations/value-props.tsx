import Image from 'next/image';
import {
  CarIcon,
  RouteIcon,
  UtensilsCrossedIcon,
  type LucideIcon,
} from 'lucide-react';

import { cn } from '@tourism/ui';
import { messages } from '@tourism/i18n';

// Icon per value prop, in catalogue order (transfers / itineraries / meals).
const ICONS: readonly LucideIcon[] = [CarIcon, RouteIcon, UtensilsCrossedIcon];

/**
 * "We've got you covered" reassurance strip. With `image` it renders as a full-bleed image band
 * (scrim + light copy); otherwise a plain section. `accentClass` themes the icon chip (plain mode).
 */
export function ValueProps({
  accentClass = 'bg-primary/10 text-primary',
  image,
}: {
  accentClass?: string;
  image?: string;
}) {
  const t = messages.destinationDetail;

  if (image) {
    return (
      <section className="relative isolate overflow-hidden py-20 sm:py-28">
        <Image
          src={image}
          alt=""
          fill
          sizes="100vw"
          className="-z-10 object-cover"
        />
        <div className="bg-overlay/70 absolute inset-0 -z-10" />
        <div className="text-on-media mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-heading mb-12 text-center text-2xl font-semibold text-balance md:text-3xl">
            {t.valuePropsHeading}
          </h2>
          <div className="grid gap-8 sm:grid-cols-3">
            {t.valueProps.map((prop, i) => {
              const Icon = ICONS[i] ?? CarIcon;
              return (
                <div
                  key={prop.title}
                  className="flex flex-col items-center gap-3 text-center"
                >
                  <span className="border-primary-foreground/25 bg-background/15 flex size-12 items-center justify-center rounded-full border backdrop-blur-sm">
                    <Icon className="size-6" />
                  </span>
                  <h3 className="text-lg font-semibold">{prop.title}</h3>
                  <p className="text-on-media/85 text-pretty">{prop.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="font-heading mb-10 text-center text-2xl font-semibold text-balance md:text-3xl">
          {t.valuePropsHeading}
        </h2>
        <div className="grid gap-8 sm:grid-cols-3">
          {t.valueProps.map((prop, i) => {
            const Icon = ICONS[i] ?? CarIcon;
            return (
              <div
                key={prop.title}
                className="flex flex-col items-center gap-3 text-center"
              >
                <span
                  className={cn(
                    'flex size-12 items-center justify-center rounded-full',
                    accentClass,
                  )}
                >
                  <Icon className="size-6" />
                </span>
                <h3 className="text-lg font-semibold">{prop.title}</h3>
                <p className="text-muted-foreground text-pretty">{prop.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default ValueProps;
