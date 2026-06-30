import { cn } from '@tourism/ui';
import { messages } from '@tourism/i18n';

/**
 * Nexora brand logo — the full "Nexora" wordmark carrying the origami two-tone
 * fold itself (see `.nexora-fold` in global.css). Mirrors the web app's brand
 * mark so the customer site and the admin console share one logo. Colour follows
 * `--nx-tone` (emerald `--primary` by default); pass a className to override.
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
