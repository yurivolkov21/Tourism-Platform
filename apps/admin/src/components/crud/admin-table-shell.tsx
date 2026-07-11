'use client';

import type { KeyboardEvent } from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { flexRender, type Table as TanstackTable } from '@tanstack/react-table';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  cn,
} from '@tourism/ui';

import { Reveal } from '../motion/reveal';

interface AdminTableShellProps<T> {
  table: TanstackTable<T>;
  /** Opt-in row interactivity: makes each row a button (role/tabindex/Enter+Space) — e.g. Enquiries. */
  onRowClick?: (row: T) => void;
  /** Fallback text when the current page has no rows (callers usually render their own outer Empty). */
  emptyLabel?: string;
}

/**
 * Shared render surface for the admin TanStack tables: a bordered table with muted header, header +
 * body driven by `flexRender`, and a `colSpan` empty fallback. The `colSpan` counts only visible leaf
 * columns so it spans correctly after columns are hidden via {@link ColumnsMenu}. Pass `onRowClick` to
 * make rows behave like buttons (keeps the Enquiries drawer-on-click working through flexRender).
 *
 * Sorting: columns that can sort (i.e. carry an `accessorFn` — display columns can't) get their header
 * wrapped in a toggle button with an asc/desc indicator and `aria-sort` on the `<th>`. Tables opt in by
 * adding `getSortedRowModel()` + accessors; tables without them render exactly as before.
 */
export function AdminTableShell<T>({
  table,
  onRowClick,
  emptyLabel = 'No results.',
}: AdminTableShellProps<T>) {
  const rows = table.getRowModel().rows;
  const colSpan = table.getVisibleLeafColumns().length;
  const interactive = Boolean(onRowClick);

  return (
    <Reveal delay={0.06} className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader className="bg-muted/50">
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id}>
              {group.headers.map((header) => {
                const canSort = header.column.getCanSort();
                const sorted = header.column.getIsSorted();
                const content = header.isPlaceholder
                  ? null
                  : flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    );
                return (
                  <TableHead
                    key={header.id}
                    aria-sort={
                      canSort
                        ? sorted === 'asc'
                          ? 'ascending'
                          : sorted === 'desc'
                            ? 'descending'
                            : 'none'
                        : undefined
                    }
                    className={
                      header.column.columnDef.meta?.align === 'right'
                        ? 'text-right'
                        : undefined
                    }
                  >
                    {canSort ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        aria-label={`Sort by ${
                          header.column.columnDef.meta?.label ?? header.id
                        }`}
                        className="hover:text-foreground -mx-1 inline-flex cursor-pointer items-center gap-1 rounded-md px-1 py-0.5 select-none"
                      >
                        {content}
                        {sorted === 'asc' ? (
                          <ArrowUp className="size-3.5" aria-hidden />
                        ) : sorted === 'desc' ? (
                          <ArrowDown className="size-3.5" aria-hidden />
                        ) : (
                          <ChevronsUpDown
                            className="size-3.5 opacity-50"
                            aria-hidden
                          />
                        )}
                      </button>
                    ) : (
                      content
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {rows.length ? (
            rows.map((row) => (
              <TableRow
                key={row.id}
                {...(interactive
                  ? {
                      role: 'button',
                      tabIndex: 0,
                      onClick: () => onRowClick?.(row.original),
                      onKeyDown: (e: KeyboardEvent) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onRowClick?.(row.original);
                        }
                      },
                    }
                  : {})}
                className={cn(
                  interactive && 'focus-visible:bg-muted/60 cursor-pointer',
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={
                      cell.column.columnDef.meta?.align === 'right'
                        ? 'text-right'
                        : undefined
                    }
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={colSpan}
                className="text-muted-foreground h-24 text-center"
              >
                {emptyLabel}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Reveal>
  );
}

export default AdminTableShell;
