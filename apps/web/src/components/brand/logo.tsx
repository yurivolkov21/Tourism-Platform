import { cn } from '@tourism/ui';
import { messages } from '@tourism/i18n';

/**
 * Nexora brandmark — the "NEX" monogram in a heavy geometric sans with an
 * origami two-tone fold (see `.nexora-fold` in global.css). Colour follows
 * `--nx-tone` (emerald by default). `aria-hidden` — the adjacent wordmark
 * carries the accessible name.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'nexora-fold font-sans font-extrabold leading-none tracking-[-0.045em]',
        className,
      )}
    >
      NEX
    </span>
  );
}

/**
 * Brand logo: the full "Nexora" wordmark carrying the origami two-tone fold itself
 * (no separate "NEX" monogram — the name *is* the mark). The diagonal fold falls
 * naturally between "Nex" and "ora", keeping continuity with the old monogram while
 * showing the full name once. Colour follows `--nx-tone` (emerald default); the
 * footer overrides it to ivory for its dark surface via the passed className.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'nexora-fold font-sans text-[1.5rem] leading-none font-extrabold tracking-[-0.045em]',
        className,
      )}
    >
      {messages.brand.name}
    </span>
  );
}

export default Logo;
