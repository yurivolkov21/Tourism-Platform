'use client';

import { Children, type ReactNode } from 'react';

import { Reveal } from './reveal';

/** Reveals each direct child with an incremental 60 ms delay (KPI rows, widget grids). */
export function Stagger({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {Children.map(children, (child, index) => (
        <Reveal delay={index * 0.06}>{child}</Reveal>
      ))}
    </div>
  );
}

export default Stagger;
