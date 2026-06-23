'use client';

import { GlareHover } from '@tourism/ui';

import { useReducedMotion } from '../../hooks/use-reduced-motion';

/**
 * Decorative light-sweep overlay for the home destination tiles. Sits above the photo + scrim but
 * below the caption (DOM order in the tile), and is `pointer-events`-transparent so clicks fall
 * through to the wrapping `<Link>`. Renders nothing under reduced-motion.
 */
export function GlareLayer() {
  const reduced = useReducedMotion();
  if (reduced) return null;

  return (
    <GlareHover
      width="100%"
      height="100%"
      background="transparent"
      borderColor="transparent"
      borderRadius="0"
      glareOpacity={0.3}
      glareSize={300}
      transitionDuration={700}
      className="!absolute inset-0 cursor-default !border-0"
    />
  );
}

export default GlareLayer;
