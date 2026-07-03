'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { MailX } from 'lucide-react';

import {
  Badge,
  Button,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
} from '@tourism/ui';

import { ServerTablePagination } from '../crud/server-table-pagination';
import { retryOutbox } from '../../lib/outbox/actions';
import type { AdminOutboxRow, PageMeta } from '../../lib/outbox/data';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function StatusBadge({ status }: { status: AdminOutboxRow['status'] }) {
  if (status === 'FAILED') return <Badge variant="destructive">Failed</Badge>;
  if (status === 'SENT') return <Badge variant="secondary">Sent</Badge>;
  return <Badge variant="outline">Pending</Badge>;
}

export function OutboxView({ rows, meta }: { rows: AdminOutboxRow[]; meta?: PageMeta }) {
  const router = useRouter();
  const [, startRetry] = useTransition();
  // A Set, not a single id: overlapping retries on DIFFERENT rows must each keep
  // their own in-flight state — a lone id would clear row A's spinner when row B
  // is clicked, re-enabling A mid-request (duplicate-retry window).
  const [retryingIds, setRetryingIds] = useState<ReadonlySet<string>>(new Set());

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

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground text-sm">{meta?.total ?? rows.length} email(s) in the queue.</p>

      {rows.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MailX />
            </EmptyMedia>
            <EmptyTitle>No emails in the queue.</EmptyTitle>
            <EmptyDescription>
              Nothing queued right now — bookings, reviews and enquiries will add rows here as they
              happen.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Last error</TableHead>
                  <TableHead>Queued</TableHead>
                  <TableHead>Processed</TableHead>
                  <TableHead className="text-right">Retry</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const isRetrying = retryingIds.has(row.id);
                  return (
                    <TableRow key={row.id}>
                      <TableCell>
                        <span className="font-mono text-xs">{row.type}</span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={row.status} />
                      </TableCell>
                      <TableCell>
                        {row.attempts > 0 ? (
                          <Badge variant="destructive">{row.attempts}</Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <span className="text-muted-foreground block truncate text-xs">
                          {row.lastError ?? '—'}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(row.createdAt)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(row.processedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.status === 'FAILED' ? (
                          <Button size="sm" onClick={() => onRetry(row.id)} disabled={isRetrying}>
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
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {meta ? (
            <ServerTablePagination
              page={meta.page}
              pageCount={meta.totalPages}
              total={meta.total}
              pageSize={meta.pageSize}
            />
          ) : null}
        </>
      )}
    </div>
  );
}

export default OutboxView;
