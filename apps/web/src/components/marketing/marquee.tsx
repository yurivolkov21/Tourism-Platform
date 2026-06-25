import type { ComponentPropsWithoutRef } from 'react';

import { cn } from '@tourism/ui';

interface MarqueeProps extends ComponentPropsWithoutRef<'div'> {
  className?: string;
  /** Reverse the scroll direction. */
  reverse?: boolean;
  /** Pause the animation while hovered. */
  pauseOnHover?: boolean;
  children: React.ReactNode;
  /** Scroll vertically instead of horizontally. */
  vertical?: boolean;
  /** How many times to repeat the children for a seamless loop. */
  repeat?: number;
}

/**
 * Infinite marquee (ported from the Shadcn Space block, brand-agnostic). Pure CSS
 * keyframes injected inline — no animation dependency. Used by the "Built with"
 * logo cloud on the About page.
 */
export function Marquee({
  className,
  reverse = false,
  pauseOnHover = false,
  children,
  vertical = false,
  repeat = 4,
  ...props
}: MarqueeProps) {
  return (
    <>
      <style>
        {`
          @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(calc(-100% - var(--gap))); } }
          @keyframes marquee-vertical { from { transform: translateY(0); } to { transform: translateY(calc(-100% - var(--gap))); } }
          .animate-marquee { animation: marquee var(--duration) linear infinite; }
          .animate-marquee-vertical { animation: marquee-vertical var(--duration) linear infinite; }
          .animate-reverse { animation-direction: reverse !important; }
          .pause-on-hover:hover .animate-marquee, .pause-on-hover:hover .animate-marquee-vertical { animation-play-state: paused !important; }
          @media (prefers-reduced-motion: reduce) { .animate-marquee, .animate-marquee-vertical { animation: none !important; } }
        `}
      </style>
      <div
        {...props}
        className={cn(
          'group flex gap-(--gap) overflow-hidden p-2 [--duration:40s] [--gap:1rem]',
          {
            'flex-row': !vertical,
            'flex-col': vertical,
            'pause-on-hover': pauseOnHover,
          },
          className,
        )}
      >
        {Array(repeat)
          .fill(0)
          .map((_, i) => (
            <div
              key={i}
              className={cn('flex shrink-0 justify-around gap-(--gap)', {
                'animate-marquee flex-row': !vertical,
                'animate-marquee-vertical flex-col': vertical,
                'animate-reverse': reverse,
              })}
            >
              {children}
            </div>
          ))}
      </div>
    </>
  );
}

export default Marquee;
