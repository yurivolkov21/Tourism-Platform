'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { FileText, Plus, Search } from 'lucide-react';
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
  type VisibilityState,
} from '@tanstack/react-table';

import {
  Badge,
  Button,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  Input,
  cn,
} from '@tourism/ui';

import { RowActions } from '../crud/row-actions';
import { deletePost } from '../../lib/posts/actions';
import type { Post } from '../../lib/posts/data';
import { formatRelativeTime } from '../../lib/relative-time';
import { DEFAULT_PAGE_SIZE } from '../crud/data-table-pagination';
import { ColumnsMenu } from '../crud/columns-menu';
import { AdminTableShell } from '../crud/admin-table-shell';
import { ClientTablePagination } from '../crud/client-table-pagination';

type Tab = 'all' | 'published' | 'draft';

const postColumns: ColumnDef<Post>[] = [
  {
    id: 'cover',
    header: 'Cover',
    meta: { label: 'Cover' },
    cell: ({ row }) => {
      const hero = (row.original.media ?? []).find((m) => m.role === 'hero');
      return hero?.url ? (
        <img
          src={hero.url}
          alt=""
          className="bg-muted aspect-16/10 w-16 rounded-md border object-cover"
        />
      ) : (
        <div className="bg-muted text-muted-foreground grid aspect-16/10 w-16 place-items-center rounded-md border">
          <FileText className="size-4" aria-hidden />
        </div>
      );
    },
  },
  {
    id: 'title',
    header: 'Title',
    enableHiding: false,
    meta: { label: 'Title' },
    cell: ({ row }) => (
      <Link
        href={`/posts/${row.original.slug}`}
        title={row.original.title}
        className="hover:text-primary block max-w-104 truncate font-medium hover:underline"
      >
        {row.original.title}
      </Link>
    ),
  },
  {
    id: 'status',
    header: 'Status',
    meta: { label: 'Status' },
    cell: ({ row }) => (
      <Badge
        variant={row.original.status === 'PUBLISHED' ? 'default' : 'secondary'}
        className="gap-1.5"
      >
        <span className="size-1.5 rounded-full bg-current opacity-70" aria-hidden />
        {row.original.status === 'PUBLISHED' ? 'Published' : 'Draft'}
      </Badge>
    ),
  },
  {
    id: 'tags',
    header: 'Tags',
    meta: { label: 'Tags' },
    cell: ({ row }) => {
      const tags = row.original.tags ?? [];
      if (tags.length === 0) return <span className="text-muted-foreground">—</span>;
      return (
        <span className="flex flex-wrap items-center gap-1">
          {tags.slice(0, 2).map((t) => (
            <Badge key={t.slug} variant="outline" className="text-xs">
              {t.name}
            </Badge>
          ))}
          {tags.length > 2 ? (
            <span className="text-muted-foreground text-xs">+{tags.length - 2}</span>
          ) : null}
        </span>
      );
    },
  },
  {
    id: 'published',
    header: 'Published',
    meta: { label: 'Published' },
    cell: ({ row }) => (
      <span className="text-muted-foreground tabular-nums">
        {row.original.publishedAt ? row.original.publishedAt.slice(0, 10) : '—'}
      </span>
    ),
  },
  {
    id: 'updated',
    header: 'Updated',
    meta: { label: 'Updated' },
    cell: ({ row }) => (
      <span className="text-muted-foreground">{formatRelativeTime(row.original.updatedAt)}</span>
    ),
  },
  {
    id: 'actions',
    header: 'Actions',
    enableHiding: false,
    meta: { align: 'right' },
    cell: ({ row }) => (
      <RowActions
        editHref={`/posts/${row.original.slug}/edit`}
        deleteAction={deletePost}
        deleteId={row.original.slug}
        deleteTitle={`Delete “${row.original.title}”?`}
        deleteDescription="This permanently deletes the post and can’t be undone."
      />
    ),
  },
];

/**
 * Client-side Posts table on TanStack: tab (status) + search filtering happens in memory (instant —
 * the whole catalog is loaded once) and feeds the already-filtered rows into the table. TanStack owns
 * only the column model, visibility (the "Columns" button), and in-memory paging.
 */
export function PostsTable({ rows }: { rows: Post[] }) {
  const [tab, setTab] = useState<Tab>('all');
  const [query, setQuery] = useState('');
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const counts = useMemo(
    () => ({
      all: rows.length,
      published: rows.filter((r) => r.status === 'PUBLISHED').length,
      draft: rows.filter((r) => r.status !== 'PUBLISHED').length,
    }),
    [rows],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (tab === 'published' && r.status !== 'PUBLISHED') return false;
      if (tab === 'draft' && r.status === 'PUBLISHED') return false;
      if (needle && !r.title.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [rows, tab, query]);

  const table = useReactTable({
    data: filtered,
    columns: postColumns,
    state: { columnVisibility },
    initialState: { pagination: { pageSize: DEFAULT_PAGE_SIZE } },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const tabs: { value: Tab; label: string; count: number }[] = [
    { value: 'all', label: 'All', count: counts.all },
    { value: 'published', label: 'Published', count: counts.published },
    { value: 'draft', label: 'Draft', count: counts.draft },
  ];

  // True zero-state (no posts at all) — before any toolbar, mirroring the old page's empty block.
  if (rows.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileText />
          </EmptyMedia>
          <EmptyTitle>No posts yet</EmptyTitle>
          <EmptyDescription>Write your first post to start the journal.</EmptyDescription>
        </EmptyHeader>
        <Button nativeButton={false} render={<Link href="/posts/new" />}>
          <Plus data-icon="inline-start" />
          New post
        </Button>
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
                  isActive ? 'bg-background text-foreground shadow-sm' : 'hover:text-foreground',
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
          <div className="relative w-full sm:max-w-xs">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title…"
              aria-label="Search posts"
              className="bg-background pl-8"
            />
          </div>
          <ColumnsMenu table={table} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileText />
            </EmptyMedia>
            <EmptyTitle>No posts match your filters</EmptyTitle>
            <EmptyDescription>Try different filters or clear them to see them all.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <AdminTableShell table={table} />
          <ClientTablePagination table={table} />
        </>
      )}
    </div>
  );
}

export default PostsTable;
