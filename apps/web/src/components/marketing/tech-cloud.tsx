import { messages } from '@tourism/i18n';

import { Marquee } from './marquee';

// The real stack the platform runs on — official brand logos via simpleicons.
// Coloured (brand colours) in light theme; switched to a light monochrome in dark
// theme so the dark-coloured marks (Next.js, Prisma…) stay legible.
const TECH = [
  { name: 'Next.js', slug: 'nextdotjs' },
  { name: 'NestJS', slug: 'nestjs' },
  { name: 'Supabase', slug: 'supabase' },
  { name: 'Prisma', slug: 'prisma' },
  { name: 'Stripe', slug: 'stripe' },
  { name: 'PayPal', slug: 'paypal' },
  { name: 'Cloudinary', slug: 'cloudinary' },
  { name: 'Tailwind CSS', slug: 'tailwindcss' },
] as const;

const colored = (slug: string) => `https://cdn.simpleicons.org/${slug}`;
const mono = (slug: string) => `https://cdn.simpleicons.org/${slug}/cbd5e1`;

/**
 * Home "Built with" logo cloud — a continuous, coloured marquee of the real tech
 * stack. Doubles as the breather between the image-led hero and the sections
 * below. Reuses the shared Marquee (pauses on hover, stops on reduced-motion).
 */
export function TechCloud() {
  const t = messages.techCloud;

  return (
    <section className="bg-background border-border/60 border-y py-10 sm:py-12">
      <p className="text-muted-foreground mb-7 text-center text-xs font-medium tracking-[0.22em] uppercase">
        {t.eyebrow}
      </p>
      <div className="relative overflow-hidden">
        <Marquee pauseOnHover className="[--duration:32s] p-0">
          {TECH.map((b) => (
            <div
              key={b.name}
              className="mr-10 flex items-center gap-2.5 opacity-90 transition-opacity hover:opacity-100 lg:mr-14"
            >
              <img
                src={colored(b.slug)}
                alt=""
                className="h-6 w-6 dark:hidden"
              />
              <img
                src={mono(b.slug)}
                alt=""
                className="hidden h-6 w-6 dark:block"
              />
              <span className="text-foreground/85 text-base font-medium whitespace-nowrap">
                {b.name}
              </span>
            </div>
          ))}
        </Marquee>
        <div className="from-background pointer-events-none absolute inset-y-0 left-0 w-1/6 bg-linear-to-r to-transparent" />
        <div className="from-background pointer-events-none absolute inset-y-0 right-0 w-1/6 bg-linear-to-l to-transparent" />
      </div>
    </section>
  );
}

export default TechCloud;
