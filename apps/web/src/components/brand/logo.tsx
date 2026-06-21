import type { SVGAttributes } from 'react';

import { cn } from '@tourism/ui';
import { messages } from '@tourism/i18n';

function LogoMark(props: SVGAttributes<SVGElement>) {
  // Placeholder mark: emerald rounded square with a brass "journey" arc.
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" {...props}>
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <path
        d="M8 21c4-9 12-9 16 0"
        className="stroke-rating"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="16" cy="11" r="2.5" className="fill-rating" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <LogoMark className="size-8" />
      <span className="font-heading text-lg font-semibold tracking-tight">
        {messages.brand.name}
      </span>
    </span>
  );
}

export default Logo;
