'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import {
  Check,
  ListFilter,
  Mail,
  MessageSquareQuote,
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
  Search,
  Star,
  Trash2,
  Undo2,
} from 'lucide-react';
import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  Input,
  Separator,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  cn,
  toast,
} from '@tourism/ui';

import { FacetFilter } from '../crud/facet-filter';
import { ColumnsMenu } from '../crud/columns-menu';
import { usePersistentColumnVisibility } from '../crud/use-persistent-column-visibility';
import { AdminTableShell } from '../crud/admin-table-shell';
import {
  deleteReview,
  setApproved,
  setFeatured,
} from '../../lib/reviews/actions';
import type { AdminReview } from '../../lib/reviews/data';
import { formatRelativeTime } from '../../lib/relative-time';

type StatusFilter = 'all' | 'pending' | 'approved';
type SourceKey = 'VERIFIED' | 'CURATED';

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
];

const SOURCE_OPTIONS: { value: SourceKey; label: string }[] = [
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'CURATED', label: 'Curated' },
];

const RATING_OPTIONS = [5, 4, 3, 2, 1].map((n) => ({
  value: String(n),
  label: `${n} star${n === 1 ? '' : 's'}`,
}));

const SEARCH_DEBOUNCE_MS = 350;

function StatusBadges({ review }: { review: AdminReview }) {
  return (
    <div className="flex flex-col items-start gap-1">
      <Badge
        variant={review.isApproved ? 'default' : 'secondary'}
        className="gap-1.5"
      >
        <span
          className="size-1.5 rounded-full bg-current opacity-70"
          aria-hidden
        />
        {review.isApproved ? 'Approved' : 'Pending'}
      </Badge>
      {review.isFeatured ? <Badge variant="outline">Featured</Badge> : null}
    </div>
  );
}

function Rating({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-1 tabular-nums">
      <Star className="size-3.5 fill-current text-amber-500" aria-hidden />
      {value}
    </span>
  );
}

/**
 * Reviews moderation surface — server-driven table (URL-owned status/source/rating/search + paging,
 * the bookings/enquiries pattern) with a right-hand drawer showing the full text plus, when the
 * review is tied to an account, the customer + booking links. Actions live in a ⋮ menu
 * (edit/approve/feature/delete); Edit and Delete only exist for CURATED testimonials (the API
 * enforces both — 409 otherwise).
 */
export function ReviewsView({
  rows,
  status,
  source,
  rating,
  search,
  totalBeyondPage = false,
}: {
  rows: AdminReview[];
  status: StatusFilter;
  source?: SourceKey;
  rating?: number;
  search: string;
  /** Reviews exist but this page is empty (overshot `?page=`) — fixes the empty-state copy. */
  totalBeyondPage?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [query, setQuery] = useState(search);
  const firstRender = useRef(true);
  const [columnVisibility, setColumnVisibility] =
    usePersistentColumnVisibility('reviews');
  const [selected, setSelected] = useState<AdminReview | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminReview | null>(null);
  const [busy, startAction] = useTransition();

  /** Build the next URL from a partial change (`null`/`undefined` value deletes), always resetting `page`. */
  const pushWith = (changes: {
    status?: StatusFilter;
    source?: SourceKey | null;
    rating?: number | null;
    q?: string;
  }) => {
    const next = new URLSearchParams(params.toString());
    if (changes.status !== undefined) {
      if (changes.status === 'all') next.delete('status');
      else next.set('status', changes.status);
    }
    if (changes.source !== undefined) {
      if (changes.source) next.set('source', changes.source);
      else next.delete('source');
    }
    if (changes.rating !== undefined) {
      if (changes.rating) next.set('rating', String(changes.rating));
      else next.delete('rating');
    }
    if (changes.q !== undefined) {
      if (changes.q.trim()) next.set('q', changes.q.trim());
      else next.delete('q');
    }
    next.delete('page');
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  // Keep the input in sync when the URL changes underneath it (back/forward,
  // chip clears) — without this the box shows a stale term after navigation.
  useEffect(() => {
    setQuery(search);
  }, [search]);

  // Debounce the search box → URL. Skip the initial mount so we don't re-push
  // on load. `params` is in the deps so a tab/facet navigation rebuilds the
  // pending timer with a fresh URL snapshot — a stale closure here would push
  // a URL that silently drops the just-applied filter.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const id = setTimeout(() => {
      if (query !== search) pushWith({ q: query });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [query, search, params]);

  /** Approve/unapprove or feature/unfeature with toast feedback; the page revalidates rows. */
  const act = (review: AdminReview, kind: 'approve' | 'feature') => {
    if (busy) return;
    startAction(async () => {
      const result =
        kind === 'approve'
          ? await setApproved(review.id, !review.isApproved)
          : await setFeatured(review.id, !review.isFeatured);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          kind === 'approve'
            ? review.isApproved
              ? 'Moved back to pending.'
              : 'Approved.'
            : review.isFeatured
              ? 'Removed from homepage.'
              : 'Pinned to homepage.',
        );
        // Keep the open drawer in step with the just-saved change.
        setSelected((cur) =>
          cur && cur.id === review.id
            ? kind === 'approve'
              ? { ...cur, isApproved: !review.isApproved }
              : { ...cur, isFeatured: !review.isFeatured }
            : cur,
        );
      }
    });
  };

  const confirmDelete = () => {
    if (!pendingDelete || busy) return;
    const target = pendingDelete;
    startAction(async () => {
      const result = await deleteReview(target.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Deleted.');
        setPendingDelete(null);
        setSelected((cur) => (cur && cur.id === target.id ? null : cur));
      }
    });
  };

  const columns = useMemo<ColumnDef<AdminReview>[]>(
    () => [
      {
        id: 'author',
        header: 'Author',
        enableHiding: false,
        meta: { label: 'Author' },
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => setSelected(row.original)}
            className="block cursor-pointer text-left"
          >
            <span className="block font-medium">{row.original.authorName}</span>
            <span className="text-muted-foreground text-xs">
              {row.original.authorLocation ?? '—'}
            </span>
          </button>
        ),
      },
      {
        id: 'review',
        header: 'Review',
        enableHiding: false,
        meta: { label: 'Review' },
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => setSelected(row.original)}
            className="block max-w-md cursor-pointer text-left"
          >
            {row.original.title ? (
              <span className="block truncate font-medium">
                {row.original.title}
              </span>
            ) : null}
            <span className="text-muted-foreground line-clamp-2 text-sm">
              {row.original.body}
            </span>
          </button>
        ),
      },
      {
        id: 'rating',
        header: 'Rating',
        meta: { label: 'Rating', align: 'right' },
        cell: ({ row }) => <Rating value={row.original.rating} />,
      },
      {
        id: 'tour',
        header: 'Tour',
        meta: { label: 'Tour' },
        cell: ({ row }) => {
          const r = row.original;
          const label = r.tourTitle ?? r.tourSlug ?? null;
          if (!label) return <span className="text-muted-foreground">—</span>;
          return r.tourSlug ? (
            <Link
              href={`/tours/${r.tourSlug}`}
              title={label}
              className="hover:text-primary block max-w-48 truncate hover:underline"
            >
              {label}
            </Link>
          ) : (
            <span className="text-muted-foreground">{label}</span>
          );
        },
      },
      {
        id: 'source',
        header: 'Source',
        meta: { label: 'Source' },
        cell: ({ row }) => (
          <Badge
            variant={
              row.original.source === 'CURATED' ? 'outline' : 'secondary'
            }
          >
            {row.original.source === 'CURATED' ? 'Curated' : 'Verified'}
          </Badge>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        meta: { label: 'Status' },
        cell: ({ row }) => <StatusBadges review={row.original} />,
      },
      {
        id: 'posted',
        header: 'Posted',
        meta: { label: 'Posted' },
        cell: ({ row }) => (
          <span className="text-muted-foreground whitespace-nowrap">
            {formatRelativeTime(row.original.createdAt)}
          </span>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        enableHiding: false,
        meta: { align: 'right' },
        cell: ({ row }) => {
          const r = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Review actions"
                    className="text-muted-foreground hover:text-foreground cursor-pointer"
                  />
                }
              >
                <MoreHorizontal className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {r.source === 'CURATED' ? (
                  <>
                    <DropdownMenuItem
                      render={<Link href={`/reviews/${r.id}/edit`} />}
                      nativeButton={false}
                    >
                      <Pencil className="size-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                ) : null}
                <DropdownMenuItem
                  onClick={() => act(r, 'approve')}
                  disabled={busy}
                >
                  {r.isApproved ? (
                    <Undo2 className="size-4" />
                  ) : (
                    <Check className="size-4" />
                  )}
                  {r.isApproved ? 'Unapprove' : 'Approve'}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => act(r, 'feature')}
                  disabled={busy}
                >
                  {r.isFeatured ? (
                    <PinOff className="size-4" />
                  ) : (
                    <Pin className="size-4" />
                  )}
                  {r.isFeatured ? 'Unfeature' : 'Feature'}
                </DropdownMenuItem>
                {r.source === 'CURATED' ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setPendingDelete(r)}
                      disabled={busy}
                    >
                      <Trash2 className="size-4" />
                      Delete
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [busy],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { columnVisibility },
    manualPagination: true,
    manualFiltering: true,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
  });

  const ratingLabel =
    RATING_OPTIONS.find((o) => o.value === String(rating))?.label ??
    'All ratings';

  const filtered = Boolean(
    status !== 'all' || source || rating || search || totalBeyondPage,
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div
          role="tablist"
          className="bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-1"
        >
          {STATUS_TABS.map((t) => {
            const isActive = t.value === status;
            return (
              <button
                key={t.value}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => pushWith({ status: t.value })}
                className={cn(
                  'inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors',
                  isActive
                    ? 'bg-background text-foreground shadow-sm'
                    : 'hover:text-foreground',
                )}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <FacetFilter
            label="Filter by source"
            icon={ListFilter}
            triggerLabel={
              source
                ? (SOURCE_OPTIONS.find((s) => s.value === source)?.label ??
                  '1 source')
                : 'All sources'
            }
            options={SOURCE_OPTIONS}
            selected={source ? [source] : []}
            onToggle={(value, checked) =>
              pushWith({ source: checked ? (value as SourceKey) : null })
            }
            onClear={() => pushWith({ source: null })}
            contentClassName="w-44"
          />
          <FacetFilter
            label="Filter by rating"
            icon={Star}
            triggerLabel={ratingLabel}
            options={RATING_OPTIONS}
            selected={rating ? [String(rating)] : []}
            onToggle={(value, checked) =>
              pushWith({ rating: checked ? Number(value) : null })
            }
            onClear={() => pushWith({ rating: null })}
            contentClassName="w-40"
          />
          <div className="relative w-full sm:max-w-xs">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search author, title, text…"
              aria-label="Search reviews"
              className="bg-background pl-8"
            />
          </div>
          <ColumnsMenu table={table} />
        </div>
      </div>

      {rows.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MessageSquareQuote />
            </EmptyMedia>
            <EmptyTitle>
              {filtered ? 'No reviews match your filters' : 'No reviews yet'}
            </EmptyTitle>
            <EmptyDescription>
              {filtered
                ? 'Try different filters or clear them to see them all.'
                : 'Reviews from travellers will appear here once they’re submitted.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <AdminTableShell table={table} />
      )}

      {/* Full-text drawer */}
      <Sheet
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
          {selected ? (
            <>
              <SheetHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <SheetTitle>{selected.authorName}</SheetTitle>
                  <Rating value={selected.rating} />
                </div>
                <SheetDescription>
                  {[selected.authorLocation, selected.tripLabel ?? null]
                    .filter(Boolean)
                    .join(' · ') || 'Traveller review'}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6 px-4 pb-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={
                      selected.source === 'CURATED' ? 'outline' : 'secondary'
                    }
                  >
                    {selected.source === 'CURATED' ? 'Curated' : 'Verified'}
                  </Badge>
                  <StatusBadges review={selected} />
                </div>

                <Separator />

                <div className="space-y-2">
                  {selected.title ? (
                    <p className="font-medium">{selected.title}</p>
                  ) : null}
                  <p className="text-muted-foreground text-sm whitespace-pre-line">
                    {selected.body}
                  </p>
                </div>

                <Separator />

                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Tour</dt>
                    <dd className="text-right">
                      {selected.tourSlug ? (
                        <Link
                          href={`/tours/${selected.tourSlug}`}
                          className="hover:text-primary hover:underline"
                        >
                          {selected.tourTitle ?? selected.tourSlug}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Posted</dt>
                    <dd>{formatRelativeTime(selected.createdAt)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Updated</dt>
                    <dd>{formatRelativeTime(selected.updatedAt)}</dd>
                  </div>
                </dl>

                {selected.userId ? (
                  <>
                    <Separator />

                    <div className="space-y-3">
                      <p className="text-sm font-medium">Customer</p>
                      <dl className="space-y-2 text-sm">
                        <div className="flex justify-between gap-4">
                          <dt className="text-muted-foreground">Name</dt>
                          <dd className="text-right">
                            {selected.userName ?? '—'}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-4">
                          <dt className="text-muted-foreground">Email</dt>
                          <dd className="text-right">
                            {selected.userEmail ? (
                              <a
                                href={`mailto:${selected.userEmail}`}
                                className="hover:text-primary inline-flex items-center gap-1 break-all hover:underline"
                              >
                                <Mail
                                  className="size-3.5 shrink-0"
                                  aria-hidden
                                />
                                {selected.userEmail}
                              </a>
                            ) : (
                              '—'
                            )}
                          </dd>
                        </div>
                        {selected.bookingCode ? (
                          <div className="flex justify-between gap-4">
                            <dt className="text-muted-foreground">Booking</dt>
                            <dd className="text-right">
                              <Link
                                href={`/bookings/${selected.bookingCode}`}
                                className="hover:text-primary hover:underline"
                              >
                                {selected.bookingCode}
                              </Link>
                            </dd>
                          </div>
                        ) : null}
                      </dl>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          nativeButton={false}
                          render={<Link href={`/users/${selected.userId}`} />}
                          className="flex-1"
                        >
                          View customer
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          nativeButton={false}
                          render={
                            <Link
                              href={`/bookings?userId=${selected.userId}`}
                            />
                          }
                          className="flex-1"
                        >
                          View their bookings
                        </Button>
                      </div>
                    </div>
                  </>
                ) : null}

                <Separator />

                <div className="flex flex-col gap-2">
                  {selected.source === 'CURATED' ? (
                    <Button
                      variant="outline"
                      nativeButton={false}
                      render={<Link href={`/reviews/${selected.id}/edit`} />}
                      className="w-full"
                    >
                      <Pencil className="size-4" />
                      Edit testimonial
                    </Button>
                  ) : null}
                  <Button
                    variant="outline"
                    onClick={() => act(selected, 'approve')}
                    disabled={busy}
                    className="w-full"
                  >
                    {selected.isApproved ? (
                      <Undo2 className="size-4" />
                    ) : (
                      <Check className="size-4" />
                    )}
                    {selected.isApproved ? 'Unapprove' : 'Approve'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => act(selected, 'feature')}
                    disabled={busy}
                    className="w-full"
                  >
                    {selected.isFeatured ? (
                      <PinOff className="size-4" />
                    ) : (
                      <Pin className="size-4" />
                    )}
                    {selected.isFeatured ? 'Unfeature' : 'Feature'}
                  </Button>
                  {selected.source === 'CURATED' ? (
                    <Button
                      variant="destructive"
                      onClick={() => setPendingDelete(selected)}
                      disabled={busy}
                      className="w-full"
                    >
                      <Trash2 className="size-4" />
                      Delete testimonial
                    </Button>
                  ) : null}
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Delete confirm (controlled, outside the menu — Base UI safe) */}
      <AlertDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete “{pendingDelete?.authorName}”’s testimonial?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the curated testimonial and can’t be
              undone. Verified traveller reviews can’t be deleted — unapprove
              those to hide them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={confirmDelete}
              disabled={busy}
            >
              {busy ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default ReviewsView;
