'use client';

import React, { useEffect, useRef, useState } from 'react';

// Ported + normalized from @shadcn-space/number-ticker-01 (MIT): pure requestAnimationFrame
// count-up, no animation library. Extended for our use: starts on scroll-into-view, honours
// prefers-reduced-motion, and supports a prefix/suffix/decimals so it can drive affixed metrics
// (e.g. "$2M", "12,000+"). Renders the final value in the DOM first → SSR / no-JS / SEO safe.

export interface NumberTickerProps extends React.HTMLAttributes<HTMLSpanElement> {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  /** Count duration in ms. */
  durationMs?: number;
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

function format(
  value: number,
  decimals: number,
  prefix: string,
  suffix: string,
): string {
  const body = value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${prefix}${body}${suffix}`;
}

export function NumberTicker({
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  durationMs = 1500,
  className,
  ...props
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  // Initial paint shows the final value — keeps it correct without JS and for crawlers.
  const [display, setDisplay] = useState<string>(() =>
    format(value, decimals, prefix, suffix),
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || typeof IntersectionObserver === 'undefined') return; // leave final value in place

    let raf = 0;
    let started = false;

    const run = () => {
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min((now - start) / durationMs, 1);
        setDisplay(format(value * easeOutCubic(t), decimals, prefix, suffix));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !started) {
          started = true;
          setDisplay(format(0, decimals, prefix, suffix));
          run();
          observer.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, prefix, suffix, decimals, durationMs]);

  return (
    <span ref={ref} className={className} {...props}>
      {display}
    </span>
  );
}

export default NumberTicker;
