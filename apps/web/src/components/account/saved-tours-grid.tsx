'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ImageIcon, XIcon } from 'lucide-react';

import { messages } from '@tourism/i18n';

import type { SavedTour } from '../../lib/api/wishlist';
import { removeFromWishlistAction } from '../../lib/wishlist/actions';

function formatPrice(currency: string, amount: string): string {
  const value = Number(amount).toLocaleString('en-US');
  return currency === 'USD' ? `$${value}` : `${currency} ${value}`;
}

/** Grid of saved tours for `/account/saved` — image-card per tour + an optimistic "remove" (un-save). */
export function SavedToursGrid({ items: initial }: { items: SavedTour[] }) {
  const t = messages.auth.account.savedPage;
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

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((s) => (
        <article
          key={s.tourId}
          className="group bg-card shadow-card relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-dropdown"
        >
          <button
            type="button"
            onClick={() => remove(s.tourId)}
            disabled={removing === s.tourId}
            aria-label={t.remove}
            className="bg-background/80 text-muted-foreground hover:text-destructive absolute top-3 right-3 z-10 inline-flex size-8 items-center justify-center rounded-full backdrop-blur-sm transition-colors disabled:opacity-50"
          >
            <XIcon className="size-4" />
          </button>
          <Link href={`/tours/${s.slug}`} className="flex flex-1 flex-col">
            <div className="bg-muted relative aspect-(--aspect-card) w-full overflow-hidden">
              {s.image ? (
                <img
                  src={s.image}
                  alt={s.title}
                  className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="text-muted-foreground flex size-full items-center justify-center">
                  <ImageIcon className="size-7" />
                </div>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-1.5 p-4">
              <h3 className="group-hover:text-primary line-clamp-2 font-sans text-base font-semibold transition-colors">
                {s.title}
              </h3>
              <p className="text-muted-foreground mt-auto text-sm">
                {t.from(formatPrice(s.currency, s.basePrice))}
              </p>
            </div>
          </Link>
        </article>
      ))}
    </div>
  );
}

export default SavedToursGrid;
