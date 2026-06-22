import { CarIcon, RouteIcon, UtensilsCrossedIcon, type LucideIcon } from 'lucide-react';

import { cn } from '@tourism/ui';
import { messages } from '@tourism/i18n';

// Icon per value prop, in catalogue order (transfers / itineraries / meals).
const ICONS: readonly LucideIcon[] = [CarIcon, RouteIcon, UtensilsCrossedIcon];

/** Compact 3-up reassurance strip ("We've got you covered"). `accentClass` themes the icon chip. */
export function ValueProps({ accentClass = 'bg-primary/10 text-primary' }: { accentClass?: string }) {
  const t = messages.destinationDetail;

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
              <div key={prop.title} className="flex flex-col items-center gap-3 text-center">
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
