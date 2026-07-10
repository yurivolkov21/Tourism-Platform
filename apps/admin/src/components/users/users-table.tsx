'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type VisibilityState,
} from '@tanstack/react-table';

import { UsersRound } from 'lucide-react';

import {
  Badge,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@tourism/ui';

import type { AdminUser, UserRole } from '../../lib/users/data';
import { UsersFilters } from './users-filters';
import { ColumnsMenu } from '../crud/columns-menu';
import { AdminTableShell } from '../crud/admin-table-shell';

/** Short date like "15 Aug 2026" from an ISO string; em dash when unparseable. */
function shortDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
}

const userColumns: ColumnDef<AdminUser>[] = [
  {
    id: 'name',
    header: 'Name',
    enableHiding: false,
    meta: { label: 'Name' },
    cell: ({ row }) => (
      <Link
        href={`/users/${row.original.id}`}
        className="hover:text-primary block font-medium hover:underline"
      >
        {row.original.fullName ?? '—'}
        <span className="text-muted-foreground block text-xs font-normal no-underline">
          {row.original.email}
        </span>
      </Link>
    ),
  },
  {
    id: 'email',
    header: 'Email',
    meta: { label: 'Email' },
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.email}</span>
    ),
  },
  {
    id: 'role',
    header: 'Role',
    meta: { label: 'Role' },
    cell: ({ row }) => (
      <Badge
        variant={row.original.role === 'ADMIN' ? 'default' : 'outline'}
        className="gap-1.5"
      >
        <span
          className="size-1.5 rounded-full bg-current opacity-70"
          aria-hidden
        />
        {row.original.role === 'ADMIN' ? 'Admin' : 'Customer'}
      </Badge>
    ),
  },
  {
    id: 'bookingsCount',
    header: 'Bookings',
    meta: { label: 'Bookings', align: 'right' },
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.bookingsCount}</span>
    ),
  },
  {
    id: 'joined',
    header: 'Joined',
    meta: { label: 'Joined' },
    cell: ({ row }) => (
      <span className="text-muted-foreground tabular-nums">
        {shortDate(row.original.createdAt)}
      </span>
    ),
  },
];

/**
 * Read-only users table on TanStack. Rows link to the detail page by id; filtering/paging stay
 * URL-driven (the page owns `UsersFilters` + `ServerTablePagination`), so the table runs in manual
 * mode and owns only the column model + the "Columns" show/hide button.
 */
export function UsersTable({
  rows,
  role,
  search,
}: {
  rows: AdminUser[];
  role: 'all' | UserRole;
  search: string;
}) {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const table = useReactTable({
    data: rows,
    columns: userColumns,
    state: { columnVisibility },
    manualPagination: true,
    manualFiltering: true,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="flex flex-col gap-4">
      {/* One toolbar row (tabs · search · Columns) — the catalog-table template; the empty state
          lives below it so the toolbar never disappears on a filtered-empty result. */}
      <UsersFilters
        role={role}
        search={search}
        trailing={<ColumnsMenu table={table} />}
      />

      {rows.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UsersRound />
            </EmptyMedia>
            <EmptyTitle>No users found</EmptyTitle>
            <EmptyDescription>
              {role !== 'all' || search
                ? 'Try a different role or clear the search to see them all.'
                : 'Accounts will appear here as people register.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <AdminTableShell table={table} />
      )}
    </div>
  );
}

export default UsersTable;
