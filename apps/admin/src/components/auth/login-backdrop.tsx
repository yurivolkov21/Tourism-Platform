'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

// WebGL aurora is client-only and heavy — load it lazily so it never blocks the
// form, and only mount it when the user hasn't asked to reduce motion.
const Aurora = dynamic(() => import('./aurora'), { ssr: false });

/**
 * Full-bleed login backdrop: a dark emerald base, an animated WebGL aurora, and
 * soft vignette/glow overlays so the centered card lifts off the background.
 * Respects `prefers-reduced-motion` by falling back to a static gradient.
 */
export function LoginBackdrop() {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setAnimate(!mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden bg-background"
    >
      {/* Static emerald wash — also the reduced-motion fallback. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 120% at 50% -10%, oklch(0.28 0.05 160) 0%, oklch(0.17 0.012 160) 55%, oklch(0.13 0.01 160) 100%)',
        }}
      />

      {/* Animated aurora layer. */}
      {animate ? (
        <div className="absolute inset-0 opacity-70">
          <Aurora amplitude={1.1} blend={0.6} speed={0.8} />
        </div>
      ) : null}

      {/* Vignette + center glow to seat the card. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(75% 60% at 50% 45%, transparent 0%, oklch(0.12 0.01 160 / 0.65) 100%)',
        }}
      />
      <div className="absolute top-1/2 left-1/2 size-144 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/15 blur-[120px]" />
    </div>
  );
}

export default LoginBackdrop;
