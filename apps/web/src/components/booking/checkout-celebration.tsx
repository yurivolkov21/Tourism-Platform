'use client';

import { useEffect, useRef } from 'react';

import { Confetti, type ConfettiRef } from '@tourism/ui';

/** CSS custom properties whose resolved colour the burst is tinted with (brand tokens, in order). */
const TOKEN_VARS = ['--primary', '--success', '--accent', '--secondary'];

/**
 * Resolves theme tokens to the hex strings canvas-confetti needs (its colour parser is hex-only,
 * while our tokens are `oklch()`). The conversion is done by the browser itself: assigning any CSS
 * colour to `fillStyle` normalises it to `#rrggbb` on read. Returns `[]` when anything is
 * unavailable — the caller then omits `colors` and the library uses its own defaults, so no hex
 * literal is ever hardcoded here.
 */
function brandConfettiColors(): string[] {
  try {
    const ctx = document.createElement('canvas').getContext('2d');
    if (!ctx) return [];
    const root = getComputedStyle(document.documentElement);
    const colors: string[] = [];
    for (const name of TOKEN_VARS) {
      const value = root.getPropertyValue(name).trim();
      if (!value) continue;
      // A rejected assignment leaves fillStyle at its previous value — seed a sentinel to detect it.
      ctx.fillStyle = '#000000';
      ctx.fillStyle = value;
      const hex = ctx.fillStyle;
      if (typeof hex === 'string' && hex.startsWith('#') && hex !== '#000000') {
        colors.push(hex);
      }
    }
    return colors;
  } catch {
    return [];
  }
}

/**
 * One-shot celebration for a freshly confirmed booking. Deliberately restrained: two quick side
 * bursts, then done — a luxury brand celebrates once, it doesn't throw a party.
 *
 * Fires at most once per booking per browser session (`sessionStorage` guard), so returning here
 * via the booking-detail "View trip details" link stays calm. Skipped entirely under
 * `prefers-reduced-motion`.
 */
export function CheckoutCelebration({ bookingCode }: { bookingCode: string }) {
  const confettiRef = useRef<ConfettiRef>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const key = `nexora:celebrated:${bookingCode}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      // Private mode / storage disabled: celebrate anyway rather than swallowing the moment.
    }

    const colors = brandConfettiColors();
    const shared = {
      particleCount: 45,
      spread: 70,
      startVelocity: 42,
      gravity: 0.9,
      scalar: 0.9,
      ticks: 180,
      ...(colors.length > 0 ? { colors } : {}),
    };

    // Two angled bursts from the lower corners — reads as a ribbon arc, not a screen-filling blast.
    const timers = [
      setTimeout(
        () =>
          confettiRef.current?.fire({
            ...shared,
            angle: 55,
            origin: { x: 0.1, y: 0.9 },
          }),
        250,
      ),
      setTimeout(
        () =>
          confettiRef.current?.fire({
            ...shared,
            angle: 125,
            origin: { x: 0.9, y: 0.9 },
          }),
        400,
      ),
    ];
    return () => timers.forEach(clearTimeout);
  }, [bookingCode]);

  return (
    <Confetti
      ref={confettiRef}
      manualstart
      className="pointer-events-none absolute inset-0 z-10 size-full"
      aria-hidden="true"
    />
  );
}

export default CheckoutCelebration;
