'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import {
  Check,
  ChevronDown,
  ListFilter,
  MessageSquareQuote,
  MoreHorizontal,
  Pin,
  PinOff,
  Search,
  Star,
  Trash2,
  Undo2,
} from 'lucide-react';
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
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
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
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

import { ColumnsMenu } from '../crud/columns-menu';
import { usePersistentColumnVisibility } from '../crud/use-persistent-column-visibility';
import { AdminTableShell } from '../crud/admin-table-shell';
import { ClientTablePagination } from '../crud/client-table-pagination';
import { DEFAULT_PAGE_SIZE } from '../crud/data-table-pagination';
import {
  deleteReview,
  setApproved,
  setFeatured,
} from '../../lib/reviews/actions';
import type { AdminReview } from '../../lib/reviews/data';
import { formatRelativeTime } from '../../lib/relative-time';

type Tab = 'all' | 'pending' | 'approved';
type SourceKey = 'VERIFIED' | 'CURATED';

const SOURCE_OPTIONS: { key: SourceKey; label: string }[] = [
  { key: 'VERIFIED', label: 'Verified' },
  { key: 'CURATED', label: 'Curated' },
];

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
 * Reviews moderation surface — client-side template table (tabs with counts, source facet,
 * instant search, Columns, pagination) + a right-hand drawer with the full text (the row already
 * carries everything — no detail endpoint). Actions live in a ⋮ menu (approve/feature/delete);
 * Delete only exists for CURATED testimonials (the API enforces it — 409 otherwise).
 */
export function ReviewsView({
  rows,
  total,
}: {
  rows: AdminReview[];
  total: number;
}) {
  const [tab, setTab] = useState<Tab>('all');
  const [sources, setSources] = useState<SourceKey[]>([]);
  const [query, setQuery] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] =
    usePersistentColumnVisibility('reviews');
  const [selected, setSelected] = useState<AdminReview | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminReview | null>(null);
  const [busy, startAction] = useTransition();

  const counts = useMemo(
    () => ({
      all: rows.length,
      pending: rows.filter((r) => !r.isApproved).length,
      approved: rows.filter((r) => r.isApproved).length,
    }),
    [rows],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (tab === 'pending' && r.isApproved) return false;
      if (tab === 'approved' && !r.isApproved) return false;
      if (sources.length && !sources.includes(r.source as SourceKey))
        return false;
      if (needle) {
        const haystack =
          `${r.authorName} ${r.title ?? ''} ${r.body}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }, [rows, tab, sources, query]);

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
        accessorFn: (row) => row.rating,
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
        accessorFn: (row) => new Date(row.createdAt).getTime(),
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
    data: filtered,
    columns,
    state: { columnVisibility, sorting },
    initialState: { pagination: { pageSize: DEFAULT_PAGE_SIZE } },
    onColumnVisibilityChange: setColumnVisibility,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const toggleSource = (key: SourceKey, checked: boolean) => {
    setSources((prev) =>
      checked ? [...prev, key] : prev.filter((s) => s !== key),
    );
  };

  const sourceLabel =
    sources.length === 0
      ? 'All sources'
      : sources.length === 1
        ? (SOURCE_OPTIONS.find((s) => s.key === sources[0])?.label ??
          '1 source')
        : `${sources.length} sources`;

  const tabs: { value: Tab; label: string; count: number }[] = [
    { value: 'all', label: 'All', count: counts.all },
    { value: 'pending', label: 'Pending', count: counts.pending },
    { value: 'approved', label: 'Approved', count: counts.approved },
  ];

  if (rows.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <MessageSquareQuote />
          </EmptyMedia>
          <EmptyTitle>No reviews yet</EmptyTitle>
          <EmptyDescription>
            Reviews from travellers will appear here once they’re submitted.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div
          role="tablist"
          className="bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-1"
        >
          {tabs.map((t) => {
            const isActive = t.value === tab;
            return (
              <button
                key={t.value}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setTab(t.value)}
                className={cn(
                  'inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors',
                  isActive
                    ? 'bg-background text-foreground shadow-sm'
                    : 'hover:text-foreground',
                )}
              >
                {t.label}
                <Badge variant="secondary" className="px-1.5 tabular-nums">
                  {t.count}
                </Badge>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  className="w-full justify-between font-normal sm:w-44"
                  aria-label="Filter by source"
                />
              }
            >
              <span className="inline-flex items-center gap-2">
                <ListFilter className="size-4 shrink-0" />
                <span className="truncate">{sourceLabel}</span>
              </span>
              <ChevronDown className="text-muted-foreground size-4 shrink-0" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Filter by source</DropdownMenuLabel>
                {SOURCE_OPTIONS.map((s) => (
                  <DropdownMenuCheckboxItem
                    key={s.key}
                    checked={sources.includes(s.key)}
                    onCheckedChange={(checked) =>
                      toggleSource(s.key, checked === true)
                    }
                    closeOnClick={false}
                  >
                    {s.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuGroup>
              {sources.length ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setSources([])}>
                    Clear filter
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
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

      {total > rows.length ? (
        <p className="text-muted-foreground text-sm">
          Showing the {rows.length} most recent of {total} reviews.
        </p>
      ) : null}

      {filtered.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MessageSquareQuote />
            </EmptyMedia>
            <EmptyTitle>No reviews match your filters</EmptyTitle>
            <EmptyDescription>
              Try different filters or clear them to see them all.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <AdminTableShell table={table} />
          <ClientTablePagination table={table} />
        </>
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

                <div className="flex flex-col gap-2">
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
