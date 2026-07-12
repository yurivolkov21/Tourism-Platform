import Image from 'next/image';
import {
  CompassIcon,
  LifeBuoyIcon,
  ShieldCheckIcon,
  UsersIcon,
  type LucideIcon,
} from 'lucide-react';

import { Card, CardContent } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { getSiteMedia } from '../../lib/api/site-media';
import { siteImage } from '../../lib/site-media';
import { SectionHeading } from '../section-heading';
import { Reveal } from './reveal';

// Built-in default — overridable via the `home-why-choose` Appearance slot.
const DEFAULT_WHY_IMAGE =
  'https://images.unsplash.com/photo-1639458110591-17c4cede0c4b?w=1920&q=70&auto=format&fit=crop';

// Four strongest pillars drawn from messages.features.items (icon paired per item).
const pillars: { index: number; icon: LucideIcon }[] = [
  { index: 0, icon: CompassIcon }, // Curated itineraries
  { index: 2, icon: UsersIcon }, // Local expert guides
  { index: 1, icon: ShieldCheckIcon }, // Secure booking
  { index: 5, icon: LifeBuoyIcon }, // 24/7 support
];

// "Why travel with us" — Lily's photo-left / cards-right composition, filled with our real
// value props (no fabricated awards).
export async function WhyChoose() {
  const t = messages.features;
  const whyImage = siteImage(
    await getSiteMedia(),
    'home-why-choose',
    DEFAULT_WHY_IMAGE,
  );

  return (
    <section className="py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title={t.heading}
          subtitle={t.subtitle}
          className="mb-10 sm:mb-14"
        />

        <div className="grid items-stretch gap-6 lg:grid-cols-2 lg:gap-10">
          {/* Team / atmosphere photo */}
          <div className="relative overflow-hidden rounded-2xl max-lg:aspect-4/3 lg:min-h-96">
            <Image
              src={whyImage}
              alt="Our team and travellers exploring Vietnam"
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
          </div>

          {/* 2×2 value cards */}
          <div className="grid gap-5 sm:grid-cols-2">
            {pillars.map(({ index, icon: Icon }, i) => {
              const item = t.items[index];
              return (
                <Reveal key={item.title} delay={i * 0.07}>
                  <Card className="border-border hover:border-primary/40 hover:shadow-card h-full transition-all duration-200 ease-out-expo hover:-translate-y-0.5">
                    <CardContent className="flex flex-col gap-3">
                      <span className="bg-primary/10 text-primary flex size-11 items-center justify-center rounded-md">
                        <Icon className="size-5" />
                      </span>
                      <h3 className="font-sans text-lg font-semibold">
                        {item.title}
                      </h3>
                      <p className="text-muted-foreground text-sm text-pretty">
                        {item.description}
                      </p>
                    </CardContent>
                  </Card>
                </Reveal>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export default WhyChoose;
