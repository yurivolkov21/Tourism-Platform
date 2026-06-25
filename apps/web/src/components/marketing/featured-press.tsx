import {
  CompassIcon,
  FeatherIcon,
  GlobeIcon,
  LandmarkIcon,
  MountainSnowIcon,
  PlaneIcon,
  type LucideIcon,
} from 'lucide-react';

import { messages } from '@tourism/i18n';

import { Marquee } from './marquee';

/**
 * Coloured "as featured in" logo cloud — a continuous marquee that doubles as the
 * breather between the hero and the sections below.
 *
 * The publications here are FICTIONAL, original brands (invented names + simple
 * emblems), NOT real outlets. Using real press marks would imply endorsements we
 * don't have and misuse their trademarks; fictional brands keep the travel-press
 * look honest (consistent with the fictional About content). Swap for real logos
 * only once genuine coverage exists.
 */
type Press = { name: string; Icon: LucideIcon; className: string; color: string };

const PRESS: Press[] = [
  { name: 'Wander', Icon: CompassIcon, className: 'font-sans text-2xl font-extrabold tracking-tight', color: 'oklch(0.64 0.15 40)' },
  { name: 'Heritage & Co.', Icon: LandmarkIcon, className: 'font-heading text-2xl font-semibold', color: 'oklch(0.55 0.09 205)' },
  { name: 'The Travel Edit', Icon: FeatherIcon, className: 'font-heading text-2xl font-medium italic', color: 'oklch(0.52 0.13 330)' },
  { name: 'Atlas', Icon: GlobeIcon, className: 'font-sans text-2xl font-bold tracking-tight', color: 'oklch(0.55 0.14 255)' },
  { name: 'Voyage', Icon: PlaneIcon, className: 'font-heading text-2xl font-semibold italic', color: 'oklch(0.62 0.12 80)' },
  { name: 'Indochine', Icon: MountainSnowIcon, className: 'font-heading text-2xl font-semibold tracking-wide', color: 'oklch(0.5 0.1 152)' },
];

export function FeaturedPress() {
  const t = messages.featuredPress;

  return (
    <section className="bg-background border-border/60 border-y py-10 sm:py-12">
      <p className="text-muted-foreground mb-6 text-center text-xs font-medium tracking-[0.22em] uppercase">
        {t.eyebrow}
      </p>
      <div className="relative overflow-hidden">
        <Marquee pauseOnHover className="[--duration:34s] p-0">
          {PRESS.map((p) => (
            <div
              key={p.name}
              className="mr-12 flex items-center gap-2 opacity-90 transition-opacity hover:opacity-100 lg:mr-16"
              style={{ color: p.color }}
            >
              <p.Icon className="size-6 shrink-0" aria-hidden />
              <span className={p.className}>{p.name}</span>
            </div>
          ))}
        </Marquee>
        <div className="from-background pointer-events-none absolute inset-y-0 left-0 w-1/6 bg-linear-to-r to-transparent" />
        <div className="from-background pointer-events-none absolute inset-y-0 right-0 w-1/6 bg-linear-to-l to-transparent" />
      </div>
    </section>
  );
}

export default FeaturedPress;
