'use client';

import { Download, MailPlus } from 'lucide-react';

import {
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
} from '@tourism/ui';

import { ServerTablePagination } from '../crud/server-table-pagination';
import { formatShortDate } from '../../lib/format-date';
import type { PageMeta, Subscriber } from '../../lib/subscribers/data';

/** Newsletter subscribers table — read-only list + CSV export (ESP-import handoff). */
export function SubscribersView({
  rows,
  meta,
  search,
}: {
  rows: Subscriber[];
  meta?: PageMeta;
  search: string;
}) {
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
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MailPlus />
            </EmptyMedia>
            <EmptyTitle>
              {search ? 'No matching subscribers' : 'No subscribers yet'}
            </EmptyTitle>
            <EmptyDescription>
              {search
                ? 'No emails match that search — clear it to see the full list.'
                : 'Signups from the website footer will appear here.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Subscribed</TableHead>
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

export default SubscribersView;
