import Link from 'next/link';

import { Badge, cn } from '@tourism/ui';

export interface TabPillItem<T extends string = string> {
  value: T;
  label: string;
  /** Count badge — rendered only when defined (0 still renders). */
  count?: number;
}

interface TabPillsProps<T extends string> {
  tabs: TabPillItem<T>[];
  value: T;
  ariaLabel?: string;
  /** `<button>` variant — for client components driving local/URL state via a callback. */
  onValueChange?: (value: T) => void;
  /** `<Link>` variant — RSC-safe, no `'use client'` needed on the caller for this piece. */
  hrefFor?: (value: T) => string;
}

/**
 * Shared segmented tablist used across every admin list toolbar (status/time facets, media/outbox
 * view switchers). Byte-compatible with the markup it replaces — same classes, same `role="tab"` +
 * `aria-selected` semantics, same optional count `Badge`. Two render modes: pass `onValueChange` for
 * the button variant (client-side state), or `hrefFor` for the `<Link>` variant (URL-driven, RSC-safe).
 */
export function TabPills<T extends string>({
  tabs,
  value,
  ariaLabel,
  onValueChange,
  hrefFor,
}: TabPillsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-1"
    >
      {tabs.map((t) => {
        const active = t.value === value;
        const className = cn(
          'inline-flex h-7 items-center gap-1.5 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors',
          !hrefFor && 'cursor-pointer',
          active
            ? 'bg-background text-foreground shadow-sm'
            : 'hover:text-foreground',
        );
        const content = (
          <>
            {t.label}
            {t.count !== undefined ? (
              <Badge variant="secondary" className="px-1.5 tabular-nums">
                {t.count}
              </Badge>
            ) : null}
          </>
        );

        return hrefFor ? (
          <Link
            key={t.value}
            href={hrefFor(t.value)}
            role="tab"
            aria-selected={active}
            className={className}
          >
            {content}
          </Link>
        ) : (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onValueChange?.(t.value)}
            className={className}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}

export default TabPills;
