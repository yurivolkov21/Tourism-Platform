'use client';

import type { KeyboardEvent } from 'react';
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
              {group.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className={
                    header.column.columnDef.meta?.align === 'right'
                      ? 'text-right'
                      : undefined
                  }
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </TableHead>
              ))}
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
