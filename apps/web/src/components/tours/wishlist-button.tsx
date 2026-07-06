'use client';

import { useEffect, useState } from 'react';
import { HeartIcon } from 'lucide-react';

import { Button, cn, toast } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { useAuth } from '../auth/auth-provider';
import {
  addToWishlistAction,
  getSavedTourIdsAction,
  removeFromWishlistAction,
} from '../../lib/wishlist/actions';

/**
 * Save/un-save toggle for the tour-detail BookingBox. Renders **only for signed-in users** (no
 * auth-gating prompt for guests). The detail page stays static/ISR — this client island fetches the
 * per-user saved state on mount via a server action, then toggles optimistically.
 */
export function WishlistButton({
  tourId,
  className,
}: {
  tourId: string;
  className?: string;
}) {
  const { user, loading } = useAuth();
  const t = messages.tourDetail.booking;
  const [saved, setSaved] = useState<boolean | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!user) {
      setSaved(null);
      return;
    }
    let active = true;
    getSavedTourIdsAction().then((ids) => {
      if (active) setSaved(ids.includes(tourId));
    });
    return () => {
      active = false;
    };
  }, [user, tourId]);

  if (loading || !user) return null;

  const toggle = async () => {
    if (pending || saved === null) return;
    const next = !saved;
    setSaved(next);
    setPending(true);
    const res = next
      ? await addToWishlistAction(tourId)
      : await removeFromWishlistAction(tourId);
    if (res.ok) {
      toast.success(next ? messages.wishlist.saved : messages.wishlist.removed);
    } else {
      setSaved(!next); // roll back a failed optimistic toggle
      toast.error(messages.wishlist.error);
    }
    setPending(false);
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      onClick={toggle}
      disabled={pending || saved === null}
      aria-pressed={saved === true}
      className={cn('w-full', className)}
    >
      <HeartIcon className={cn('size-4', saved && 'fill-current text-primary')} />
      {saved ? t.saved : t.save}
    </Button>
  );
}

export default WishlistButton;
