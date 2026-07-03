'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Search } from 'lucide-react';

import { Input, cn } from '@tourism/ui';

import type { UserRole } from '../../lib/users/data';

type TabValue = 'all' | UserRole;

const TABS: { value: TabValue; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'ADMIN', label: 'Admins' },
  { value: 'CUSTOMER', label: 'Customers' },
];

const SEARCH_DEBOUNCE_MS = 350;

/**
 * Toolbar for the users list: role tabs + a debounced search box. Both write to the URL
 * (`?role=&q=&page=`) so filtering/pagination happen **server-side** on the next navigation. Any
 * filter change resets to page 1.
 */
export function UsersFilters({
  role,
  search,
  trailing,
}: {
  role: TabValue;
  search: string;
  /** Toolbar extras rendered after the search box (e.g. the Columns menu) — one row, catalog-style. */
  trailing?: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [query, setQuery] = useState(search);
  const firstRender = useRef(true);

  /** Build the next URL from a partial change, always resetting `page`. */
  const pushWith = (changes: { role?: TabValue; q?: string }) => {
    const next = new URLSearchParams(params.toString());
    if (changes.role !== undefined) {
      if (changes.role === 'all') next.delete('role');
      else next.set('role', changes.role);
    }
    if (changes.q !== undefined) {
      if (changes.q.trim()) next.set('q', changes.q.trim());
      else next.delete('q');
    }
    next.delete('page');
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  // Debounce the search box → URL. Skip the initial mount so we don't re-push on load.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const id = setTimeout(() => {
      if (query !== search) pushWith({ q: query });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [query]);

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div
        role="tablist"
        className="bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-1"
      >
        {TABS.map((t) => {
          const active = t.value === role;
          return (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => pushWith({ role: t.value })}
              className={cn(
                'inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors',
                active ? 'bg-background text-foreground shadow-sm' : 'hover:text-foreground',
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or email…"
            aria-label="Search users"
            className="bg-background pl-8"
          />
        </div>
        {trailing}
      </div>
    </div>
  );
}

export default UsersFilters;
