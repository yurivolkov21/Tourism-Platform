import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@tourism/ui';

import { CuratedForm } from '../../../../../components/reviews/curated-form';
import { updateCurated } from '../../../../../lib/reviews/actions';
import { findAdminReview } from '../../../../../lib/reviews/data';

interface EditReviewPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Edit-curated-testimonial page. Verified reviews aren't editable (customer words stay immutable),
 * so an id that resolves to a VERIFIED review — or doesn't resolve at all — 404s here (the API would
 * also 409 on save, but there's no point showing the form for a row that can never be edited).
 */
export default async function EditReviewPage({ params }: EditReviewPageProps) {
  const { id } = await params;

  const review = await findAdminReview(id).catch(() => undefined);
  if (!review || review.source !== 'CURATED') notFound();

  const action = updateCurated.bind(null, id);

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
        <h1 className="font-heading text-2xl font-bold">Edit testimonial</h1>
        <p className="text-muted-foreground text-sm">{review.authorName}</p>
      </div>

      <CuratedForm action={action} review={review} submitLabel="Save changes" />
    </div>
  );
}
