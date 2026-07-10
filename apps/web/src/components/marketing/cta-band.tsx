import Image from 'next/image';
import { ArrowRightIcon } from 'lucide-react';

import { buttonVariants, cn } from '@tourism/ui';

import { Reveal } from './reveal';

// Vietnam scenery behind the end-of-page CTA (Hạ Long Bay). Neutral Unsplash placeholder.
const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1668000018482-a02acf02b22a?w=1920&q=70&auto=format&fit=crop';

// Reusable end-of-page CTA — a full-bleed background photo with a brand-tinted gradient
// scrim, copy left + action right. Prop-driven so each page supplies its own copy
// (from @tourism/i18n) and, optionally, its own background image.
export type CtaBandProps = {
  heading: string;
  subtitle: string;
  cta: { label: string; href: string };
  image?: string;
};

export function CtaBand({
  heading,
  subtitle,
  cta,
  image = DEFAULT_IMAGE,
}: CtaBandProps) {
  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="group relative isolate overflow-hidden rounded-2xl">
            <Image
              src={image}
              alt=""
              fill
              sizes="(min-width: 1280px) 1216px, 100vw"
              className="ease-out-expo -z-10 object-cover transition-transform duration-700 group-hover:scale-105"
            />
            {/* Brand-tinted scrim — dark on the copy side, emerald wash on the action side */}
            <div className="from-overlay/90 via-overlay/70 to-primary/45 absolute inset-0 -z-10 bg-linear-to-r" />

            <div className="text-on-media flex flex-col gap-6 px-6 py-14 sm:px-10 lg:flex-row lg:items-center lg:justify-between lg:px-14 lg:py-20">
              <div className="max-w-2xl space-y-3">
                <h2 className="text-2xl font-semibold text-balance md:text-3xl lg:text-4xl">
                  {heading}
                </h2>
                <p className="text-on-media/85 text-lg text-pretty">
                  {subtitle}
                </p>
              </div>
              <a
                href={cta.href}
                className={cn(
                  buttonVariants({ size: 'lg' }),
                  'bg-background text-foreground hover:bg-background/90 shrink-0',
                )}
              >
                {cta.label}
                <ArrowRightIcon />
              </a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export default CtaBand;
