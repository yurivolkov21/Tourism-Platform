import Image from 'next/image';

import { cn } from '@tourism/ui';

/**
 * Adventure signature (Northern Vietnam) — a bold, dark full-bleed band with a stat row, distinct
 * in structure from the light image+text signature used by other regions.
 */
export function RegionSignatureAdventure({
  eyebrow,
  heading,
  body,
  stats,
  image,
  accentText,
}: {
  eyebrow: string;
  heading: string;
  body: string;
  stats: { value: string; label: string }[];
  image: string;
  accentText: string;
}) {
  return (
    <section className="relative isolate overflow-hidden py-20 sm:py-28">
      {image ? (
        <Image
          src={image}
          alt=""
          fill
          sizes="100vw"
          className="-z-10 object-cover"
        />
      ) : null}
      <div className="bg-foreground/85 absolute inset-0 -z-10" />

      <div className="text-primary-foreground mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl space-y-4">
          <span
            className={cn(
              'text-xs font-semibold tracking-widest uppercase',
              accentText,
            )}
          >
            {eyebrow}
          </span>
          <h2 className="font-heading text-3xl font-semibold text-balance sm:text-4xl lg:text-5xl">
            {heading}
          </h2>
          <p className="text-primary-foreground/85 text-lg text-pretty">
            {body}
          </p>
        </div>

        <dl className="mt-12 grid grid-cols-2 gap-8 sm:mt-16 sm:grid-cols-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="border-primary-foreground/15 border-t pt-4"
            >
              <dt
                className={cn(
                  'font-heading text-3xl font-bold sm:text-4xl',
                  accentText,
                )}
              >
                {s.value}
              </dt>
              <dd className="text-primary-foreground/75 mt-1 text-sm text-pretty">
                {s.label}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

export default RegionSignatureAdventure;
