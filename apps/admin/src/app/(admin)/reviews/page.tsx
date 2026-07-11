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
import { ServerTablePagination } from '../../../components/crud/server-table-pagination';
import { parsePageSize } from '../../../lib/pagination';
import { parseRatingParam } from '../../../lib/params';

type StatusFilter = 'pending' | 'approved';
type SourceFilter = 'VERIFIED' | 'CURATED';

/** Narrows a raw `?status=` value to a valid filter (else undefined = all). */
function parseStatus(raw?: string): StatusFilter | undefined {
  return raw === 'pending' || raw === 'approved' ? raw : undefined;
}

/** Narrows a raw `?source=` value to a valid filter (else undefined = all). */
function parseSource(raw?: string): SourceFilter | undefined {
  return raw === 'VERIFIED' || raw === 'CURATED' ? raw : undefined;
}

/** Narrows a raw `?page=` value to a positive integer (defaults to 1). */
function parsePage(raw?: string): number {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

interface ReviewsPageProps {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    status?: string;
    source?: string;
    rating?: string;
    q?: string;
  }>;
}

export default async function ReviewsPage({ searchParams }: ReviewsPageProps) {
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const pageSize = parsePageSize(sp.pageSize);
  const status = parseStatus(sp.status);
  const source = parseSource(sp.source);
  const rating = parseRatingParam(sp.rating);
  const search = sp.q?.trim() ?? '';

  let result: AdminReviewList | undefined;
  let error: string | null = null;
  try {
    result = await listAdminReviews({
      page,
      pageSize,
      isApproved:
        status === 'pending' ? false : status === 'approved' ? true : undefined,
      source,
      rating,
      search: search || undefined,
    });
  } catch (e) {
    error = apiErrorMessage(e);
  }

  const rows = result?.data ?? [];
  const meta = result?.meta;

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
        <>
          <ReviewsView
            rows={rows}
            status={status ?? 'all'}
            source={source}
            rating={rating}
            search={search}
            totalBeyondPage={(meta?.total ?? 0) > 0 && rows.length === 0}
          />
          {/* Guard on total (not the page's rows) — an empty overshot page
              still needs the pager so the admin can navigate back. */}
          {meta && meta.total > 0 ? (
            <ServerTablePagination
              page={meta.page}
              pageCount={meta.totalPages}
              total={meta.total}
              pageSize={meta.pageSize}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
