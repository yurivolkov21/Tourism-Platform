'use client';

import { useActionState } from 'react';
import Link from 'next/link';

import { Button, Input, Label, Textarea } from '@tourism/ui';

import { createCurated, type CuratedFormState } from '../../lib/reviews/actions';

const INITIAL: CuratedFormState = {};

/** Create-curated-testimonial form. The API stores it approved + featured (it's for the homepage). */
export function CuratedForm() {
  const [state, action, pending] = useActionState(createCurated, INITIAL);

  return (
    <form action={action} className="max-w-xl space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="authorName">Traveller name</Label>
        <Input id="authorName" name="authorName" placeholder="Emily Carter" required />
        {state.fieldErrors?.authorName ? (
          <p className="text-destructive text-xs">{state.fieldErrors.authorName}</p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="authorLocation">Location (optional)</Label>
          <Input id="authorLocation" name="authorLocation" placeholder="Sydney, Australia" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tripLabel">Trip (optional)</Label>
          <Input id="tripLabel" name="tripLabel" placeholder="Hạ Long Bay Cruise" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="rating">Rating</Label>
        <Input
          id="rating"
          name="rating"
          type="number"
          min={1}
          max={5}
          defaultValue={5}
          className="w-24"
        />
        {state.fieldErrors?.rating ? (
          <p className="text-destructive text-xs">{state.fieldErrors.rating}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="body">Testimonial</Label>
        <Textarea
          id="body"
          name="body"
          rows={4}
          placeholder="What made the trip memorable…"
          required
        />
        {state.fieldErrors?.body ? (
          <p className="text-destructive text-xs">{state.fieldErrors.body}</p>
        ) : null}
      </div>

      {state.error ? <p className="text-destructive text-sm">{state.error}</p> : null}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Create testimonial'}
        </Button>
        <Button type="button" variant="ghost" nativeButton={false} render={<Link href="/reviews" />}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default CuratedForm;
