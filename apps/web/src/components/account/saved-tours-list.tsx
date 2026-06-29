'use client';

import { useState } from 'react';
import Link from 'next/link';
import { HeartIcon, XIcon } from 'lucide-react';

import { ScrollArea, cn } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import type { DashboardSavedTour } from './account-dashboard';
import { removeFromWishlistAction } from '../../lib/wishlist/actions';

/** Saved-tours list for the account dashboard — links to each tour + an optimistic "remove" (un-save).
 * Scrolls inside its own ScrollArea so a long list never stretches the card. */
export function SavedToursList({
  items: initial,
  className,
}: {
  items: DashboardSavedTour[];
  className?: string;
}) {
  const t = messages.auth.account.dashboard.saved;
  const [items, setItems] = useState(initial);
  const [removing, setRemoving] = useState<string | null>(null);

  const remove = async (tourId: string) => {
    if (removing) return;
    setRemoving(tourId);
    const prev = items;
    setItems((cur) => cur.filter((s) => s.tourId !== tourId)); // optimistic
    const res = await removeFromWishlistAction(tourId);
    if (!res.ok) setItems(prev); // roll back on failure
    setRemoving(null);
  };

  if (items.length === 0) {
    return (
      <p className={cn('text-muted-foreground text-sm text-pretty', className)}>{t.empty}</p>
    );
  }

  return (
    <ScrollArea className={className}>
      <ul className="space-y-3 pr-3">
        {items.map((s) => (
        <li key={s.slug} className="group flex items-center gap-3">
          <Link href={`/tours/${s.slug}`} className="flex min-w-0 flex-1 items-center gap-3">
            <div className="bg-muted size-12 shrink-0 overflow-hidden rounded-lg">
              {s.image ? (
                <img src={s.image} alt="" className="size-full object-cover" />
              ) : (
                <HeartIcon className="text-muted-foreground m-auto mt-3.5 size-4" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="group-hover:text-primary truncate text-sm font-medium transition-colors">
                {s.title}
              </p>
              <p className="text-muted-foreground text-xs">{t.from(s.priceLabel)}</p>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => remove(s.tourId)}
            disabled={removing === s.tourId}
            aria-label={t.remove}
            className="text-muted-foreground hover:text-destructive shrink-0 rounded-full p-1.5 transition-colors disabled:opacity-50"
          >
            <XIcon className="size-4" />
          </button>
        </li>
        ))}
      </ul>
    </ScrollArea>
  );
}

export default SavedToursList;
