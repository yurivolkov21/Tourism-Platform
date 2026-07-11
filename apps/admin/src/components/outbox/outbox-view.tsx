'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { MailX, Trash2 } from 'lucide-react';
import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
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
import { usePersistentColumnVisibility } from '../crud/use-persistent-column-visibility';
import { ServerTablePagination } from '../crud/server-table-pagination';
import { formatShortDate } from '../../lib/format-date';
import { deleteOutboxRow, retryOutbox } from '../../lib/outbox/actions';
import type { AdminOutboxRow, PageMeta } from '../../lib/outbox/data';

function StatusBadge({ status }: { status: AdminOutboxRow['status'] }) {
  if (status === 'FAILED') return <Badge variant="destructive">Failed</Badge>;
  if (status === 'SENT') return <Badge variant="secondary">Sent</Badge>;
  return <Badge variant="outline">Pending</Badge>;
}

/**
 * Outbox queue table on the shared admin stack (AdminTableShell + ColumnsMenu +
 * ServerTablePagination — the server-paginated variant, like Users). Retry and Delete stay
 * **inline buttons** (deliberate deviation from RowActions: the in-flight spinner belongs on the
 * Retry button — spec 2026-07-05). Delete is confirmed via `AlertDialog` (PENDING/FAILED only; SENT
 * rows are delivery history and the API 409s if asked — wave C, 2026-07-11).
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
  const [deleting, startDelete] = useTransition();
  const [columnVisibility, setColumnVisibility] =
    usePersistentColumnVisibility('outbox');
  // A Set, not a single id: overlapping retries on DIFFERENT rows must each keep
  // their own in-flight state — a lone id would clear row A's spinner when row B
  // is clicked, re-enabling A mid-request (duplicate-retry window).
  const [retryingIds, setRetryingIds] = useState<ReadonlySet<string>>(
    new Set(),
  );
  const [pendingDelete, setPendingDelete] = useState<AdminOutboxRow | null>(
    null,
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

  const confirmDelete = () => {
    if (!pendingDelete || deleting) return;
    const target = pendingDelete;
    startDelete(async () => {
      const res = await deleteOutboxRow(target.id);
      if (res.ok) {
        toast.success('Deleted.');
        setPendingDelete(null);
        router.refresh();
      } else {
        toast.error(res.error ?? 'Could not delete this email.');
      }
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
        id: 'actions',
        header: 'Actions',
        enableHiding: false,
        meta: { align: 'right' },
        cell: ({ row }) => {
          const r = row.original;
          const canDelete = r.status === 'PENDING' || r.status === 'FAILED';
          const isRetrying = retryingIds.has(r.id);
          if (!canDelete) return null;
          return (
            <div className="flex justify-end gap-2">
              {r.status === 'FAILED' ? (
                <Button
                  size="sm"
                  onClick={() => onRetry(r.id)}
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
              ) : null}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPendingDelete(r)}
                aria-label="Delete this queued email"
              >
                <Trash2 className="size-4" />
                Delete
              </Button>
            </div>
          );
        },
      },
    ],
    // Only retryingIds matters: onRetry/setPendingDelete are re-created each render but stable in behavior.
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
    const totalBeyondPage = (meta?.total ?? 0) > 0;
    return (
      <div className="flex flex-col gap-4">
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MailX />
            </EmptyMedia>
            <EmptyTitle>
              {totalBeyondPage
                ? 'Nothing on this page.'
                : 'No emails in the queue.'}
            </EmptyTitle>
            <EmptyDescription>
              {totalBeyondPage
                ? 'The queue shrank below this page — jump back with the pager.'
                : 'Nothing queued right now — bookings, reviews and enquiries will add rows here as they happen.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
        {/* Keep the pager on an overshot page (e.g. after deleting the last
            row of the last page) so the admin can navigate back. */}
        {meta && meta.total > 0 ? (
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

      <AlertDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this queued email?</AlertDialogTitle>
            <AlertDialogDescription>
              It will never be sent. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default OutboxView;
