'use client';

import React from 'react';

export type StarBorderProps<T extends React.ElementType> =
  React.ComponentPropsWithoutRef<T> & {
    as?: T;
    className?: string;
    children?: React.ReactNode;
    color?: string;
    speed?: React.CSSProperties['animationDuration'];
    thickness?: number;
  };

export const StarBorder = <T extends React.ElementType = 'button'>({
  as,
  className = '',
  // Brand token (Emerald Heritage) star sweep, not a raw color.
  color = 'var(--color-primary)',
  speed = '6s',
  thickness = 1,
  children,
  ...rest
}: StarBorderProps<T>) => {
  const Component = as || 'button';

  return (
    <Component
      className={`relative inline-block overflow-hidden rounded-[20px] ${className}`}
      {...(rest as Record<string, unknown>)}
      style={{
        padding: `${thickness}px 0`,
        ...(rest as { style?: React.CSSProperties }).style,
      }}
    >
      <div
        className="animate-star-movement-bottom absolute right-[-250%] bottom-[-11px] z-0 h-[50%] w-[300%] rounded-full opacity-70"
        style={{
          background: `radial-gradient(circle, ${color}, transparent 10%)`,
          animationDuration: speed,
        }}
      ></div>
      <div
        className="animate-star-movement-top absolute -top-2.5 left-[-250%] z-0 h-[50%] w-[300%] rounded-full opacity-70"
        style={{
          background: `radial-gradient(circle, ${color}, transparent 10%)`,
          animationDuration: speed,
        }}
      ></div>
      <div className="relative z-1 rounded-[20px] border border-border bg-linear-to-b from-card to-background px-[26px] py-4 text-center text-[16px] text-foreground">
        {children}
      </div>
    </Component>
  );
};

export default StarBorder;
