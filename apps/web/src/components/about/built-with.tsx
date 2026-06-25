import { messages } from '@tourism/i18n';

import { Marquee } from '../marketing/marquee';
import { Reveal } from '../marketing/reveal';

// The real stack the platform is built on. Monochrome simpleicons (muted slate),
// with a light + dark variant so the strip reads on both themes.
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

const icon = (slug: string, color: string) => `https://cdn.simpleicons.org/${slug}/${color}`;

/**
 * "Built with" logo cloud — the Testimonial-02 brand strip repurposed honestly as
 * the project's real tech stack (no fabricated partner logos). Marquee + edge fades.
 */
export function BuiltWith() {
  const t = messages.about.builtWith;

  return (
    <section className="pb-16 sm:pb-20 lg:pb-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="border-border flex flex-col gap-6 border-t pt-12">
            <p className="text-muted-foreground text-center text-base">{t.caption}</p>
            <div className="relative overflow-hidden py-2">
              <Marquee pauseOnHover className="[--duration:28s] p-0">
                {TECH.map((b) => (
                  <div key={b.name} className="mr-12 flex items-center lg:mr-20">
                    <img
                      src={icon(b.slug, '64748b')}
                      alt={b.name}
                      className="h-7 w-auto opacity-80 transition-opacity hover:opacity-100 dark:hidden"
                    />
                    <img
                      src={icon(b.slug, '94a3b8')}
                      alt={b.name}
                      className="hidden h-7 w-auto opacity-80 transition-opacity hover:opacity-100 dark:block"
                    />
                  </div>
                ))}
              </Marquee>

              {/* Edge fades */}
              <div className="from-background pointer-events-none absolute inset-y-0 left-0 w-1/5 bg-linear-to-r to-transparent" />
              <div className="from-background pointer-events-none absolute inset-y-0 right-0 w-1/5 bg-linear-to-l to-transparent" />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export default BuiltWith;
