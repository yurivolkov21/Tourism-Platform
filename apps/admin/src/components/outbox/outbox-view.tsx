'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { MailX } from 'lucide-react';
import {
  getCoreRowModel,
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
  Spinner,
  toast,
} from '@tourism/ui';

import { AdminTableShell } from '../crud/admin-table-shell';
import { ColumnsMenu } from '../crud/columns-menu';
import { ServerTablePagination } from '../crud/server-table-pagination';
import { formatShortDate } from '../../lib/format-date';
import { retryOutbox } from '../../lib/outbox/actions';
import type { AdminOutboxRow, PageMeta } from '../../lib/outbox/data';

function StatusBadge({ status }: { status: AdminOutboxRow['status'] }) {
  if (status === 'FAILED') return <Badge variant="destructive">Failed</Badge>;
  if (status === 'SENT') return <Badge variant="secondary">Sent</Badge>;
  return <Badge variant="outline">Pending</Badge>;
}

/**
 * Outbox queue table on the shared admin stack (AdminTableShell + ColumnsMenu +
 * ServerTablePagination — the server-paginated variant, like Users). Retry stays an
 * **inline button** (deliberate deviation from RowActions: the queue has exactly one
 * action and the in-flight spinner belongs on the button — spec 2026-07-05).
 */
export function OutboxView({
  rows,
  meta,
}: {
  rows: AdminOutboxRow[];
  meta?: PageMeta;
}) {
  const router = useRouter();
  const [, startRetry] = useTransition();
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  // A Set, not a single id: overlapping retries on DIFFERENT rows must each keep
  // their own in-flight state — a lone id would clear row A's spinner when row B
  // is clicked, re-enabling A mid-request (duplicate-retry window).
  const [retryingIds, setRetryingIds] = useState<ReadonlySet<string>>(
    new Set(),
  );

  const onRetry = (id: string) => {
    setRetryingIds((prev) => new Set(prev).add(id));
    startRetry(async () => {
      const res = await retryOutbox(id);
      if (res.ok) {
        toast('Queued for the next send pass.');
        router.refresh();
      } else {
        toast.error(res.error ?? 'Retry failed.');
      }
      setRetryingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    });
  };

  const columns = useMemo<ColumnDef<AdminOutboxRow>[]>(
    () => [
      {
        id: 'type',
        header: 'Type',
        enableHiding: false,
        meta: { label: 'Type' },
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.type}</span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        enableHiding: false,
        meta: { label: 'Status' },
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: 'attempts',
        header: 'Attempts',
        meta: { label: 'Attempts' },
        cell: ({ row }) =>
          row.original.attempts > 0 ? (
            <Badge variant="destructive">{row.original.attempts}</Badge>
          ) : (
            <span className="text-muted-foreground">0</span>
          ),
      },
      {
        id: 'lastError',
        header: 'Last error',
        meta: { label: 'Last error' },
        cell: ({ row }) => (
          <span className="text-muted-foreground block max-w-xs truncate text-xs">
            {row.original.lastError ?? '—'}
          </span>
        ),
      },
      {
        id: 'queued',
        header: 'Queued',
        meta: { label: 'Queued' },
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {formatShortDate(row.original.createdAt)}
          </span>
        ),
      },
      {
        id: 'processed',
        header: 'Processed',
        meta: { label: 'Processed' },
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {formatShortDate(row.original.processedAt)}
          </span>
        ),
      },
      {
        id: 'retry',
        header: 'Retry',
        enableHiding: false,
        meta: { align: 'right' },
        cell: ({ row }) => {
          if (row.original.status !== 'FAILED') return null;
          const isRetrying = retryingIds.has(row.original.id);
          return (
            <Button
              size="sm"
              onClick={() => onRetry(row.original.id)}
              disabled={isRetrying}
            >
              {isRetrying ? (
                <>
                  <Spinner />
                  Retrying…
                </>
              ) : (
                'Retry'
              )}
            </Button>
          );
        },
      },
    ],
    // Only retryingIds matters: onRetry is re-created each render but stable in behavior.
    [retryingIds],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { columnVisibility },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    // Server-paginated: the page's rows come in pre-sliced; no client row models.
    manualPagination: true,
  });

  if (rows.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <MailX />
          </EmptyMedia>
          <EmptyTitle>No emails in the queue.</EmptyTitle>
          <EmptyDescription>
            Nothing queued right now — bookings, reviews and enquiries will add
            rows here as they happen.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          {meta?.total ?? rows.length} email(s) in the queue.
        </p>
        <ColumnsMenu table={table} />
      </div>

      <AdminTableShell table={table} />
      {meta ? (
        <ServerTablePagination
          page={meta.page}
          pageCount={meta.totalPages}
          total={meta.total}
          pageSize={meta.pageSize}
        />
      ) : null}
    </div>
  );
}

export default OutboxView;
