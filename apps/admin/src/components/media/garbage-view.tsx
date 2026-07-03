'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Recycle } from 'lucide-react';

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
import { runMediaCleanup } from '../../lib/media-library/actions';
import type { MediaGarbageRow, PageMeta } from '../../lib/media-library/data';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function GarbageView({ rows, meta }: { rows: MediaGarbageRow[]; meta?: PageMeta }) {
  const router = useRouter();
  const [running, startRun] = useTransition();

  const onRunNow = () => {
    startRun(async () => {
      const res = await runMediaCleanup();
      if (res.ok) {
        toast(`Cleanup ran: ${res.destroyed ?? 0} destroyed, ${res.failed ?? 0} failed.`);
        router.refresh();
      } else {
        toast.error(res.error ?? 'Cleanup failed.');
      }
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          {meta?.total ?? rows.length} asset(s) queued for Cloudinary deletion. The daily cron
          clears this automatically; run it now to purge immediately.
        </p>
        <Button onClick={onRunNow} disabled={running || rows.length === 0}>
          {running ? (
            <>
              <Spinner />
              Running…
            </>
          ) : (
            'Run cleanup now'
          )}
        </Button>
      </div>

      {rows.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Recycle />
            </EmptyMedia>
            <EmptyTitle>Queue is clean</EmptyTitle>
            <EmptyDescription>
              Deleted media has already been purged from Cloudinary.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Public ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Last error</TableHead>
                  <TableHead>Queued</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell className="max-w-md">
                      <span className="block truncate font-mono text-xs">{g.publicId}</span>
                    </TableCell>
                    <TableCell className="capitalize">{g.resourceType}</TableCell>
                    <TableCell>
                      {g.attempts > 0 ? (
                        <Badge variant="destructive">{g.attempts}</Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <span className="text-muted-foreground block truncate text-xs">
                        {g.lastError ?? '—'}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(g.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
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
