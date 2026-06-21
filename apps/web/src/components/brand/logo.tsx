import { cn } from '@tourism/ui';
import { messages } from '@tourism/i18n';

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      {/* Temporary "TP" monogram — replace with the real brand mark later. */}
      <span
        aria-hidden="true"
        className="bg-primary text-primary-foreground font-heading flex size-8 items-center justify-center rounded-md text-sm font-semibold tracking-tight"
      >
        TP
      </span>
      <span className="font-heading text-lg font-semibold tracking-tight">
        {messages.brand.name}
      </span>
    </span>
  );
}

export default Logo;
