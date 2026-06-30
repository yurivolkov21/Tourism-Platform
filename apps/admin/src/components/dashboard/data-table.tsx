'use client';

import { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Columns3,
  GripVertical,
} from 'lucide-react';
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type Row,
  type VisibilityState,
} from '@tanstack/react-table';

import {
  Badge,
  Button,
  Checkbox,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  Input,
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

const EDIT_INPUT_CLASS =
  'h-8 w-full border-transparent bg-transparent shadow-none hover:border-input focus-visible:border-input';

/** Drag handle — uses the row's sortable listeners (view-only reorder, not persisted). */
function DragHandle({ id }: { id: string }) {
  const { attributes, listeners } = useSortable({ id });
  return (
    <button
      type="button"
      {...attributes}
      {...listeners}
      className="text-muted-foreground hover:text-foreground flex size-7 cursor-grab items-center justify-center rounded-md active:cursor-grabbing"
      aria-label="Drag to reorder"
    >
      <GripVertical className="size-4" />
    </button>
  );
}

function DraggableRow({ row }: { row: Row<AdminBookingRow> }) {
  const { transform, transition, setNodeRef, isDragging } = useSortable({ id: row.original.code });
  return (
    <TableRow
      ref={setNodeRef}
      data-state={row.getIsSelected() ? 'selected' : undefined}
      data-dragging={isDragging || undefined}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="data-dragging:bg-muted/60 relative"
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
      ))}
    </TableRow>
  );
}

export function DataTable({ rows }: { rows: AdminBookingRow[] }) {
  // Local copy so drag-reorder + inline edits are reflected in the view (view-only; not persisted).
  const [data, setData] = useState<AdminBookingRow[]>(rows);
  const [rowSelection, setRowSelection] = useState({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [statusTab, setStatusTab] = useState<'all' | BookingRowStatus>('all');

  const columns = useMemo<ColumnDef<AdminBookingRow>[]>(() => {
    const editCell = (code: string, key: 'tourTitle' | 'totalAmount', value: string) =>
      setData((prev) => prev.map((r) => (r.code === code ? { ...r, [key]: value } : r)));
    return [
      { id: 'drag', header: () => null, cell: ({ row }) => <DragHandle id={row.original.code} />, enableHiding: false },
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
          <Checkbox checked={row.getIsSelected()} onCheckedChange={(v) => row.toggleSelected(!!v)} aria-label="Select row" />
        ),
        enableHiding: false,
      },
      { accessorKey: 'code', header: 'Code', cell: ({ row }) => <span className="font-medium">{row.original.code}</span> },
      {
        accessorKey: 'tourTitle',
        header: 'Tour',
        cell: ({ row }) => (
          <Input
            value={row.original.tourTitle}
            onChange={(e) => editCell(row.original.code, 'tourTitle', e.target.value)}
            className={EDIT_INPUT_CLASS}
            aria-label="Tour"
          />
        ),
      },
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
        cell: ({ row }) => (
          <Input
            value={row.original.totalAmount}
            onChange={(e) => editCell(row.original.code, 'totalAmount', e.target.value)}
            className={`${EDIT_INPUT_CLASS} tabular-nums`}
            aria-label="Amount"
            inputMode="decimal"
          />
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Created',
        cell: ({ row }) => <span className="text-muted-foreground">{formatDay(row.original.createdAt)}</span>,
      },
    ];
  }, []);

  const table = useReactTable({
    data,
    columns,
    getRowId: (row) => row.code,
    state: { rowSelection, columnVisibility, columnFilters },
    initialState: { pagination: { pageSize: 10 } },
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const sensors = useSensors(useSensor(MouseSensor), useSensor(TouchSensor), useSensor(KeyboardSensor));
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setData((prev) => {
      const from = prev.findIndex((r) => r.code === active.id);
      const to = prev.findIndex((r) => r.code === over.id);
      return from < 0 || to < 0 ? prev : arrayMove(prev, from, to);
    });
  };

  const counts = STATUSES.reduce(
    (acc, s) => ({ ...acc, [s]: data.filter((r) => r.status === s).length }),
    {} as Record<BookingRowStatus, number>,
  );
  const onTab = (value: string) => {
    const v = value as 'all' | BookingRowStatus;
    setStatusTab(v);
    table.getColumn('status')?.setFilterValue(v === 'all' ? undefined : v);
  };

  const selectedCount = table.getFilteredSelectedRowModel().rows.length;
  const totalFiltered = table.getFilteredRowModel().rows.length;
  const pageRows = table.getRowModel().rows;
  const pageIds = pageRows.map((r) => r.original.code);

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar: status tabs + column visibility */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={statusTab} onValueChange={onTab}>
          <TabsList>
            <TabsTrigger value="all">
              All <Badge variant="secondary" className="ml-1.5">{data.length}</Badge>
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

      {/* Table (drag-reorderable rows) */}
      <div className="overflow-hidden rounded-lg border">
        <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={onDragEnd}>
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
                <SortableContext items={pageIds} strategy={verticalListSortingStrategy}>
                  {pageRows.map((row) => (
                    <DraggableRow key={row.id} row={row} />
                  ))}
                </SortableContext>
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-muted-foreground h-24 text-center">
                    No bookings yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DndContext>
      </div>

      {/* Pagination footer */}
      <div className="flex flex-col gap-3 px-1 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-muted-foreground text-sm">
          {selectedCount} of {totalFiltered} row(s) selected.
        </span>
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
