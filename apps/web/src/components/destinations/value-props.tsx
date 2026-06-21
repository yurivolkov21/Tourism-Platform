import { CarIcon, CompassIcon, HeartHandshakeIcon, type LucideIcon } from 'lucide-react';

import { messages } from '@tourism/i18n';

// Icon per value prop, in catalogue order (transfers / experiences / advice).
const ICONS: readonly LucideIcon[] = [CarIcon, CompassIcon, HeartHandshakeIcon];

/** Compact 3-up reassurance strip ("We've got you covered"). */
export function ValueProps() {
  const t = messages.destinationDetail;

  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="font-heading mb-10 text-center text-2xl font-semibold text-balance md:text-3xl">
          {t.valuePropsHeading}
        </h2>

        <div className="grid gap-8 sm:grid-cols-3">
          {t.valueProps.map((prop, i) => {
            const Icon = ICONS[i] ?? CompassIcon;
            return (
              <div key={prop.title} className="flex flex-col items-center gap-3 text-center">
                <span className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-full">
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
