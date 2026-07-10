import { Marquee } from './marquee';

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

const icon = (slug: string, color: string) =>
  `https://cdn.simpleicons.org/${slug}/${color}`;

/** Shared "built with" logo marquee (real tech stack) with edge fades. */
export function TechMarquee({ className }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden py-2 ${className ?? ''}`}>
      <Marquee pauseOnHover className="[--duration:28s] p-0">
        {TECH.map((b) => (
          <div key={b.name} className="mr-12 flex items-center lg:mr-16">
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
      <div className="from-background pointer-events-none absolute inset-y-0 left-0 w-1/5 bg-linear-to-r to-transparent" />
      <div className="from-background pointer-events-none absolute inset-y-0 right-0 w-1/5 bg-linear-to-l to-transparent" />
    </div>
  );
}

export default TechMarquee;
