import { cn } from '@tourism/ui';
import { messages } from '@tourism/i18n';

/**
 * Nexora brandmark — a geometric "N" whose descending diagonal reads as a
 * mountain ridge, with the sun rising behind it. The name decomposes to
 * *nexus* (connection) + *aurora/horizon* (dawn of a journey), so the mark
 * leans on the sunrise idea rather than a literal travel cliché.
 *
 * Pure SVG paths using `currentColor`, so it inherits whatever text colour the
 * surrounding context sets (theme tokens, the brand tile, footer overrides…).
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      role="img"
      aria-hidden="true"
      className={className}
    >
      {/* sun rising in the sky, above the ridge */}
      <circle cx="18.5" cy="12" r="2.6" fill="currentColor" />
      {/* the "N" — left upright, the ridge descending right, then the right upright */}
      <path
        d="M8 24V8l16 16V8"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface LogoProps {
  className?: string;
  /** Hide the wordmark and render the brand tile only (e.g. tight headers). */
  showWordmark?: boolean;
}

export function Logo({ className, showWordmark = true }: LogoProps) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <span
        aria-hidden="true"
        className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-md"
      >
        <LogoMark className="size-5" />
      </span>
      {showWordmark && (
        <span className="font-heading text-lg font-semibold tracking-tight">
          {messages.brand.name}
        </span>
      )}
    </span>
  );
}

export default Logo;
