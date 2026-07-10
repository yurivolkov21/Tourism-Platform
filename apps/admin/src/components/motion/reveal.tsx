'use client';

import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';

/**
 * Subtle enter reveal for admin surfaces (fade + 12 px rise, 0.35 s, once). Uses
 * `whileInView` (IntersectionObserver) so it works regardless of which element scrolls,
 * and renders statically under `prefers-reduced-motion`. Client leaf — safe to wrap
 * Server Component children.
 */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.35, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

export default Reveal;
