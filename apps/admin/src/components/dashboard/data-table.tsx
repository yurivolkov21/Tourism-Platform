'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Columns3 } from 'lucide-react';
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
  Button,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@tourism/ui';

import type { AdminBookingRow, BookingRowStatus } from '../../lib/dashboard/bookings-table';
import { formatDay } from '../../lib/dashboard/transforms';

const STATUS_VARIANT: Record<BookingRowStatus, 'default' | 'outline' | 'secondary' | 'destructive'> = {
  PAID: 'default',
  PENDING: 'outline',
  CANCELLED: 'secondary',
  REFUNDED: 'destructive',
};
const STATUSES: BookingRowStatus[] = ['PAID', 'PENDING', 'CANCELLED', 'REFUNDED'];

export function DataTable({ rows }: { rows: AdminBookingRow[] }) {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [statusTab, setStatusTab] = useState<'all' | BookingRowStatus>('all');

  const columns = useMemo<ColumnDef<AdminBookingRow>[]>(
    () => [
      {
        accessorKey: 'code',
        header: 'Code',
        cell: ({ row }) => (
          <Link href={`/bookings/${row.original.code}`} className="hover:text-primary font-medium hover:underline">
            {row.original.code}
          </Link>
        ),
      },
      { accessorKey: 'tourTitle', header: 'Tour' },
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
      {
        accessorKey: 'travellers',
        header: 'Travellers',
        cell: ({ row }) => <span className="tabular-nums">{row.original.travellers}</span>,
      },
      {
        accessorKey: 'totalAmount',
        header: 'Amount',
        cell: ({ row }) => <span className="tabular-nums">{row.original.totalAmount}</span>,
      },
      {
        accessorKey: 'createdAt',
        header: 'Created',
        cell: ({ row }) => <span className="text-muted-foreground">{formatDay(row.original.createdAt)}</span>,
      },
    ],
    [],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getRowId: (row) => row.code,
    state: { columnVisibility, columnFilters },
    initialState: { pagination: { pageSize: 10 } },
    onColumnVisibilityChange: setColumnVisibility,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const counts = STATUSES.reduce(
    (acc, s) => ({ ...acc, [s]: rows.filter((r) => r.status === s).length }),
    {} as Record<BookingRowStatus, number>,
  );
  const onTab = (value: string) => {
    const v = value as 'all' | BookingRowStatus;
    setStatusTab(v);
    table.getColumn('status')?.setFilterValue(v === 'all' ? undefined : v);
  };

  const pageRows = table.getRowModel().rows;

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar: status tabs + column visibility */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={statusTab} onValueChange={onTab}>
          <TabsList>
            <TabsTrigger value="all">
              All <Badge variant="secondary" className="ml-1.5">{rows.length}</Badge>
            </TabsTrigger>
            {STATUSES.map((s) => (
              <TabsTrigger key={s} value={s} className="capitalize">
                {s.toLowerCase()} <Badge variant="secondary" className="ml-1.5">{counts[s]}</Badge>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="cursor-pointer" />}>
            <Columns3 className="size-4" /> Columns <ChevronDown className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            {table
              .getAllColumns()
              .filter((c) => c.getCanHide())
              .map((c) => (
                <DropdownMenuCheckboxItem
                  key={c.id}
                  checked={c.getIsVisible()}
                  onCheckedChange={(v) => c.toggleVisibility(!!v)}
                  className="capitalize"
                >
                  {c.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
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
            {pageRows.length ? (
              pageRows.map((row) => (
                <TableRow key={row.id}>
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

      {/* Pagination footer */}
      <div className="flex flex-col gap-3 px-1 sm:flex-row sm:items-center sm:justify-end">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Rows per page</span>
            <Select value={String(table.getState().pagination.pageSize)} onValueChange={(v) => table.setPageSize(Number(v))}>
              <SelectTrigger size="sm" className="w-16" aria-label="Rows per page">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 30].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <span className="text-sm font-medium">
            Page {table.getState().pagination.pageIndex + 1} of {Math.max(1, table.getPageCount())}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon-sm" className="cursor-pointer" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()} aria-label="First page">
              <ChevronsLeft className="size-4" />
            </Button>
            <Button variant="outline" size="icon-sm" className="cursor-pointer" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} aria-label="Previous page">
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="outline" size="icon-sm" className="cursor-pointer" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} aria-label="Next page">
              <ChevronRight className="size-4" />
            </Button>
            <Button variant="outline" size="icon-sm" className="cursor-pointer" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()} aria-label="Last page">
              <ChevronsRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DataTable;
