'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type VisibilityState,
} from '@tanstack/react-table';

import { Badge, Button } from '@tourism/ui';

import type { PostList } from '../../lib/posts/data';
import { DeletePost } from './delete-post';
import { ColumnsMenu } from '../crud/columns-menu';
import { AdminTableShell } from '../crud/admin-table-shell';

type PostRow = PostList['data'][number];

const postColumns: ColumnDef<PostRow>[] = [
  {
    id: 'title',
    header: 'Title',
    enableHiding: false,
    meta: { label: 'Title' },
    cell: ({ row }) => <span className="font-medium">{row.original.title}</span>,
  },
  {
    id: 'status',
    header: 'Status',
    meta: { label: 'Status' },
    cell: ({ row }) => (
      <Badge variant={row.original.status === 'PUBLISHED' ? 'default' : 'secondary'}>
        {row.original.status === 'PUBLISHED' ? 'Published' : 'Draft'}
      </Badge>
    ),
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
    id: 'actions',
    header: 'Actions',
    enableHiding: false,
    meta: { align: 'right' },
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-1">
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href={`/posts/${row.original.slug}/edit`} />}
        >
          Edit
        </Button>
        <DeletePost slug={row.original.slug} title={row.original.title} />
      </div>
    ),
  },
];

/**
 * Posts table on TanStack. Search/status filtering + paging stay URL-driven in the page's native
 * `<form>` + `ServerTablePagination`, so the table runs in manual mode and owns only the column model
 * + the "Columns" show/hide button.
 */
export function PostsTable({ rows }: { rows: PostRow[] }) {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const table = useReactTable({
    data: rows,
    columns: postColumns,
    state: { columnVisibility },
    manualPagination: true,
    manualFiltering: true,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <ColumnsMenu table={table} />
      </div>
      <AdminTableShell table={table} />
    </div>
  );
}

export default PostsTable;
