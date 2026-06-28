'use client';

import { useState, useTransition } from 'react';
import { CheckCircle2, Star, Undo2 } from 'lucide-react';

import { Button } from '@tourism/ui';

import { setApproved, setFeatured } from '../../lib/reviews/actions';

/** Approve/re-draft + feature/unfeature toggles for one review row. Refreshes via `revalidatePath`. */
export function ReviewActions({
  id,
  isApproved,
  isFeatured,
}: {
  id: string;
  isApproved: boolean;
  isFeatured: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  const run = (fn: () => Promise<{ error?: string }>) =>
    startTransition(async () => {
      setError(undefined);
      const res = await fn();
      if (res?.error) setError(res.error);
    });

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center justify-end gap-1">
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => run(() => setApproved(id, !isApproved))}
        >
          {isApproved ? <Undo2 data-icon="inline-start" /> : <CheckCircle2 data-icon="inline-start" />}
          {isApproved ? 'Unapprove' : 'Approve'}
        </Button>
        <Button
          variant={isFeatured ? 'secondary' : 'ghost'}
          size="sm"
          disabled={pending}
          onClick={() => run(() => setFeatured(id, !isFeatured))}
        >
          <Star data-icon="inline-start" className={isFeatured ? 'fill-current' : undefined} />
          {isFeatured ? 'Unfeature' : 'Feature'}
        </Button>
      </div>
      {error ? <span className="text-destructive text-xs">{error}</span> : null}
    </div>
  );
}

export default ReviewActions;
