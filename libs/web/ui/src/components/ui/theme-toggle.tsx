'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

import { cn } from '../../lib/utils';
import { AnimatedThemeToggler } from './animated-theme-toggler';

/**
 * Navbar-ready theme switch: pairs the (controlled) AnimatedThemeToggler with next-themes for
 * persistence + no-flash SSR. Renders an inert placeholder until mounted so the icon never
 * mismatches between server and client.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <span className={cn('inline-block', className)} aria-hidden />;

  return (
    <AnimatedThemeToggler
      className={className}
      theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
      onThemeChange={(theme) => setTheme(theme)}
    />
  );
}

export default ThemeToggle;
