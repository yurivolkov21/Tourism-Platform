import type { ReactNode } from 'react';

import { AnimatedContent } from '@tourism/ui';

/** Subtle on-scroll reveal (fade + slight rise) for section entrances. Brand-tuned defaults; the
 * underlying AnimatedContent renders visible without JS and skips animation under reduced-motion. */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <AnimatedContent
      distance={40}
      duration={0.6}
      threshold={0.12}
      delay={delay}
      className={className}
    >
      {children}
    </AnimatedContent>
  );
}

export default Reveal;
