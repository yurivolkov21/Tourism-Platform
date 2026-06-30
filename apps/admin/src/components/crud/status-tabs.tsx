import Link from 'next/link';

import { cn } from '@tourism/ui';

export interface StatusTab {
  value: string;
  label: string;
  href: string;
}

/**
 * Shared admin filter tabs — a segmented control rendered as links (server-side filtering via the
 * URL), styled to match the shadcn Tabs look used on the dashboard.
 */
export function AdminStatusTabs({ tabs, active }: { tabs: StatusTab[]; active: string }) {
  return (
    <div
      role="tablist"
      className="bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-1"
    >
      {tabs.map((t) => {
        const isActive = t.value === active;
        return (
          <Link
            key={t.value}
            href={t.href}
            role="tab"
            aria-selected={isActive}
            className={cn(
              'inline-flex h-7 items-center justify-center rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors',
              isActive
                ? 'bg-background text-foreground shadow-sm'
                : 'hover:text-foreground cursor-pointer',
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}

export default AdminStatusTabs;
