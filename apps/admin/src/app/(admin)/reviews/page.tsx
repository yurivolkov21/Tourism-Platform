import Link from 'next/link';
import { Plus } from 'lucide-react';

import { Button } from '@tourism/ui';

import { apiErrorMessage } from '../../../lib/api/error';
import { AdminListHeader } from '../../../components/crud/list-header';
import { ReviewsView } from '../../../components/reviews/reviews-view';
import {
  listAdminReviews,
  type AdminReviewList,
} from '../../../lib/reviews/data';
import { ErrorAlert } from '../../../components/crud/error-alert';

export default async function ReviewsPage() {
  let result: AdminReviewList | undefined;
  let error: string | null = null;
  try {
    result = await listAdminReviews({ pageSize: 100 });
  } catch (e) {
    error = apiErrorMessage(e);
  }
  const rows = result?.data ?? [];

  return (
    <div className="flex flex-col gap-6 px-4 py-6 lg:px-6">
      <AdminListHeader
        title="Reviews"
        description="Approve traveller reviews and pin the best ones (or curated testimonials) to the homepage carousel."
        action={
          <Button nativeButton={false} render={<Link href="/reviews/new" />}>
            <Plus data-icon="inline-start" />
            New testimonial
          </Button>
        }
      />

      {error ? (
        <ErrorAlert>Couldn&apos;t load reviews: {error}.</ErrorAlert>
      ) : (
        <ReviewsView rows={rows} total={result?.meta.total ?? rows.length} />
      )}
    </div>
  );
}
