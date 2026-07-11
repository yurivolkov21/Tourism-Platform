import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@tourism/ui';

import { CuratedForm } from '../../../../components/reviews/curated-form';
import { createCurated } from '../../../../lib/reviews/actions';

export default function NewCuratedReviewPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 lg:px-6">
      <Button
        variant="ghost"
        size="sm"
        nativeButton={false}
        render={<Link href="/reviews" />}
      >
        <ArrowLeft data-icon="inline-start" />
        Back to reviews
      </Button>

      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-bold">New testimonial</h1>
        <p className="text-muted-foreground text-sm">
          A curated testimonial isn’t tied to a booking. It’s published and
          featured on the homepage straight away.
        </p>
      </div>

      <CuratedForm action={createCurated} submitLabel="Create testimonial" />
    </div>
  );
}
