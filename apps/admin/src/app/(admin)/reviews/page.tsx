import Link from 'next/link';
import { MessageSquareQuote, Plus, Star } from 'lucide-react';

import {
  Badge,
  Button,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@tourism/ui';

import { apiErrorMessage } from '../../../lib/api/error';
import { ReviewActions } from '../../../components/reviews/review-actions';
import { listAdminReviews, type AdminReviewList } from '../../../lib/reviews/data';

interface ReviewsPageProps {
  searchParams: Promise<{ status?: string }>;
}

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
] as const;

export default async function ReviewsPage({ searchParams }: ReviewsPageProps) {
  const { status } = await searchParams;
  const active = status === 'pending' || status === 'approved' ? status : 'all';
  const isApproved = active === 'all' ? undefined : active === 'approved';

  let result: AdminReviewList | undefined;
  let error: string | null = null;
  try {
    result = await listAdminReviews({ isApproved });
  } catch (e) {
    error = apiErrorMessage(e);
  }
  const rows = result?.data ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-bold">Reviews</h1>
          <p className="text-muted-foreground text-sm">
            Approve traveller reviews and pin the best ones (or curated testimonials) to the homepage
            carousel.
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/reviews/new" />}>
          <Plus data-icon="inline-start" />
          New testimonial
        </Button>
      </div>

      <div className="flex items-center gap-1">
        {FILTERS.map((f) => (
          <Button
            key={f.key}
            size="sm"
            variant={active === f.key ? 'secondary' : 'ghost'}
            nativeButton={false}
            render={<Link href={f.key === 'all' ? '/reviews' : `/reviews?status=${f.key}`} />}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {error ? (
        <div className="border-destructive/30 bg-destructive/5 text-destructive rounded-lg border p-4 text-sm">
          Couldn&apos;t load reviews: {error}.
        </div>
      ) : rows.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MessageSquareQuote />
            </EmptyMedia>
            <EmptyTitle>No reviews here</EmptyTitle>
            <EmptyDescription>
              {active === 'pending'
                ? 'Nothing is waiting for approval.'
                : 'Reviews from travellers will appear here once they’re submitted.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Author</TableHead>
                <TableHead>Review</TableHead>
                <TableHead className="w-16 text-center">Rating</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="align-top">
                    <p className="font-medium">{r.authorName}</p>
                    <p className="text-muted-foreground text-xs">
                      {[r.tourSlug, r.authorLocation].filter(Boolean).join(' · ') || '—'}
                    </p>
                  </TableCell>
                  <TableCell className="align-top">
                    <p className="text-muted-foreground line-clamp-2 max-w-md text-sm">{r.body}</p>
                  </TableCell>
                  <TableCell className="text-center align-top">
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Star className="size-3.5 fill-current text-amber-500" />
                      {r.rating}
                    </span>
                  </TableCell>
                  <TableCell className="align-top">
                    <Badge variant={r.source === 'CURATED' ? 'outline' : 'secondary'}>
                      {r.source === 'CURATED' ? 'Curated' : 'Verified'}
                    </Badge>
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="flex flex-col gap-1">
                      <Badge variant={r.isApproved ? 'default' : 'secondary'}>
                        {r.isApproved ? 'Approved' : 'Pending'}
                      </Badge>
                      {r.isFeatured ? <Badge variant="outline">Featured</Badge> : null}
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    <ReviewActions
                      id={r.id}
                      isApproved={r.isApproved}
                      isFeatured={r.isFeatured}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
