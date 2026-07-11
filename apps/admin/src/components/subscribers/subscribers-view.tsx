'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Download, MailPlus, Trash2 } from 'lucide-react';

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
} from '@tourism/ui';

import { ServerTablePagination } from '../crud/server-table-pagination';
import { formatShortDate } from '../../lib/format-date';
import { removeSubscriber } from '../../lib/subscribers/actions';
import type { PageMeta, Subscriber } from '../../lib/subscribers/data';

/**
 * Newsletter subscribers table — read-only list + CSV export (ESP-import handoff), plus a per-row
 * "Remove" (outbox-style inline single action — sanctioned deviation from `RowActions`) with a
 * confirm dialog.
 */
export function SubscribersView({
  rows,
  meta,
  search,
}: {
  rows: Subscriber[];
  meta?: PageMeta;
  search: string;
}) {
  const router = useRouter();
  const [pendingRemove, setPendingRemove] = useState<Subscriber | null>(null);
  const [busy, startAction] = useTransition();

  const confirmRemove = () => {
    if (!pendingRemove || busy) return;
    const target = pendingRemove;
    startAction(async () => {
      const result = await removeSubscriber(target.id);
      if (result.ok) {
        toast.success('Subscriber removed.');
        setPendingRemove(null);
        router.refresh();
      } else {
        toast.error(result.error ?? 'Could not remove subscriber.');
      }
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <form method="get" className="flex items-center gap-2">
          <input
            type="search"
            name="q"
            defaultValue={search}
            placeholder="Search by email…"
            aria-label="Search subscribers by email"
            className="border-input bg-background focus-visible:ring-ring h-9 w-64 rounded-md border px-3 text-sm outline-none focus-visible:ring-2"
          />
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="cursor-pointer"
          >
            Search
          </Button>
        </form>
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<a href="/subscribers/export" download />}
        >
          <Download className="size-4" />
          Export CSV
        </Button>
      </div>

      {rows.length === 0 ? (
        <>
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <MailPlus />
              </EmptyMedia>
              <EmptyTitle>
                {search
                  ? 'No matching subscribers'
                  : (meta?.total ?? 0) > 0
                    ? 'Nothing on this page'
                    : 'No subscribers yet'}
              </EmptyTitle>
              <EmptyDescription>
                {search
                  ? 'No emails match that search — clear it to see the full list.'
                  : (meta?.total ?? 0) > 0
                    ? 'The list shrank below this page — jump back with the pager.'
                    : 'Signups from the website footer will appear here.'}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
          {/* Keep the pager on an overshot page (e.g. the last row of the last
              page was just removed) so the admin can navigate back. */}
          {meta && meta.total > 0 ? (
            <ServerTablePagination
              page={meta.page}
              pageCount={meta.totalPages}
              total={meta.total}
              pageSize={meta.pageSize}
            />
          ) : null}
        </>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Subscribed</TableHead>
                  <TableHead className="text-right">Remove</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.email}</TableCell>
                    <TableCell>
                      {s.source ? (
                        <Badge variant="secondary" className="capitalize">
                          {s.source}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatShortDate(s.subscribedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Remove ${s.email}`}
                        className="text-muted-foreground hover:text-destructive cursor-pointer"
                        onClick={() => setPendingRemove(s)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
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

      <AlertDialog
        open={Boolean(pendingRemove)}
        onOpenChange={(open) => !open && setPendingRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove subscriber?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove {pendingRemove?.email} from the newsletter? They can
              re-subscribe any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={confirmRemove}
              disabled={busy}
            >
              {busy ? 'Removing…' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default SubscribersView;
