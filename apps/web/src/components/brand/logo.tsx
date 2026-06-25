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
 * Full lockup: the NEX mark + the "Nexora" wordmark (Fraunces). No tile — the
 * mark sits as emerald letters beside the serif wordmark, so it never competes
 * with the emerald CTA in the header. The footer overrides `--nx-tone` (mark)
 * and the wordmark colour for its dark surface.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-baseline gap-2', className)}>
      <LogoMark className="text-[1.55rem]" />
      <span className="font-heading text-lg font-semibold tracking-tight">
        {messages.brand.name}
      </span>
    </span>
  );
}

export default Logo;
