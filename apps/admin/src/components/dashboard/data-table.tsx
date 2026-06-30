'use client';

import { useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type VisibilityState,
} from '@tanstack/react-table';

import {
  Badge,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@tourism/ui';

import type { AdminBookingRow, BookingRowStatus } from '../../lib/dashboard/bookings-table';
import { formatDay, formatMoney } from '../../lib/dashboard/transforms';

const STATUS_VARIANT: Record<BookingRowStatus, 'default' | 'outline' | 'secondary' | 'destructive'> = {
  PAID: 'default',
  PENDING: 'outline',
  CANCELLED: 'secondary',
  REFUNDED: 'destructive',
};

const columns: ColumnDef<AdminBookingRow>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(v) => row.toggleSelected(!!v)}
        aria-label="Select row"
      />
    ),
    enableHiding: false,
  },
  { accessorKey: 'code', header: 'Code', cell: ({ row }) => <span className="font-medium">{row.original.code}</span> },
  { accessorKey: 'tourTitle', header: 'Tour', cell: ({ row }) => <span className="line-clamp-1">{row.original.tourTitle}</span> },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <Badge variant={STATUS_VARIANT[row.original.status]} className="capitalize">
        {row.original.status.toLowerCase()}
      </Badge>
    ),
  },
  { accessorKey: 'contactName', header: 'Customer' },
  { accessorKey: 'travellers', header: 'Travellers', cell: ({ row }) => <span className="tabular-nums">{row.original.travellers}</span> },
  {
    accessorKey: 'totalAmount',
    header: 'Amount',
    cell: ({ row }) => <span className="tabular-nums">{formatMoney(row.original.totalAmount, row.original.currency)}</span>,
  },
  { accessorKey: 'createdAt', header: 'Created', cell: ({ row }) => <span className="text-muted-foreground">{formatDay(row.original.createdAt)}</span> },
];

export function DataTable({ rows }: { rows: AdminBookingRow[] }) {
  const [rowSelection, setRowSelection] = useState({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const table = useReactTable({
    data: rows,
    columns,
    state: { rowSelection, columnVisibility, columnFilters },
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader className="bg-muted/50">
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id}>
              {hg.headers.map((h) => (
                <TableHead key={h.id}>
                  {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-muted-foreground h-24 text-center">
                No bookings yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export default DataTable;
