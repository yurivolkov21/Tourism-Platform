import * as React from 'react';

import { cn } from '../../lib/utils';

// Inspired by @shadcn-space/shine-border-02 (MIT) but re-authored for our brand: a slow, low-opacity
// emerald/brass shine that sweeps around the border ring (mask-composite), tuned down from the source's
// fast "laser scan" so it reads as a light-luxury highlight, not a SaaS gimmick. Pure CSS — the sweep
// freezes under `prefers-reduced-motion`.

export interface ShineBorderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Border ring thickness in px. */
  borderWidth?: number;
  /** Sweep duration in seconds (higher = calmer). */
  duration?: number;
  /** Corner radius in px (match the wrapped surface). */
  radius?: number;
  children?: React.ReactNode;
}

export function ShineBorder({
  borderWidth = 1,
  duration = 7,
  radius = 12,
  className,
  style,
  children,
  ...props
}: ShineBorderProps) {
  return (
    <div
      className={cn('relative isolate', className)}
      style={{ borderRadius: `${radius}px`, ...style }}
      {...props}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] motion-reduce:animate-none"
        style={{
          padding: `${borderWidth}px`,
          background:
            'linear-gradient(110deg, transparent 35%, color-mix(in oklab, var(--color-primary) 55%, transparent) 50%, color-mix(in oklab, var(--color-chart-2) 45%, transparent) 60%, transparent 75%)',
          backgroundSize: '250% 100%',
          WebkitMask: 'linear-gradient(white 0 0) content-box, linear-gradient(white 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
          animation: `shine-border-sweep ${duration}s linear infinite`,
        }}
      />
      {children}
      <style>{
        '@keyframes shine-border-sweep{from{background-position:150% 0}to{background-position:-150% 0}}'
      }</style>
    </div>
  );
}

export default ShineBorder;
