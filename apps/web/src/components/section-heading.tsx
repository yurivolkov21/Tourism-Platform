import type { ElementType, ReactNode } from 'react';

import { cn } from '@tourism/ui';

/**
 * Shared section header rhythm: optional uppercase eyebrow + Fraunces heading +
 * muted subtitle. Mirrors the mobile `section-heading.tsx` prop shape. Presentational,
 * tokens only. Bespoke headers (accent-bar tour panels via `TourSection`, view-all
 * rows, hero h1s) intentionally do NOT use this.
 */
export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  as = 'h2',
  align = 'center',
  tone = 'default',
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  as?: 'h2' | 'h3';
  align?: 'left' | 'center';
  tone?: 'default' | 'onMedia';
  className?: string;
}) {
  const Heading = as as ElementType;
  const onMedia = tone === 'onMedia';
  return (
    <div
      className={cn(
        'space-y-3',
        align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl',
        className,
      )}
    >
      {eyebrow ? (
        <p
          className={cn(
            'text-xs font-semibold tracking-widest uppercase',
            onMedia ? 'text-on-media/80' : 'text-primary',
          )}
        >
          {eyebrow}
        </p>
      ) : null}
      <Heading
        className={cn(
          'font-heading font-semibold text-balance',
          as === 'h2'
            ? 'text-2xl md:text-3xl lg:text-4xl'
            : 'text-xl md:text-2xl',
          onMedia && 'text-on-media',
        )}
      >
        {title}
      </Heading>
      {subtitle ? (
        <p
          className={cn(
            'text-lg text-pretty',
            onMedia ? 'text-on-media/85' : 'text-muted-foreground',
          )}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

export default SectionHeading;
