'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { Compass, Inbox, Search } from 'lucide-react';

import {
  Badge,
  Button,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  cn,
  toast,
} from '@tourism/ui';

import { ServerTablePagination } from '../crud/server-table-pagination';
import { updateEnquiryStatus } from '../../lib/enquiries/actions';
import type { Enquiry, PageMeta } from '../../lib/enquiries/data';
import { ENQUIRY_STATUSES, enquiryStatusMeta, type EnquiryStatus } from '../../lib/enquiries/status';
import { EnquiryStatusBadge } from './enquiry-status-badge';

type TabValue = 'all' | EnquiryStatus;

const TABS: { value: TabValue; label: string }[] = [
  { value: 'all', label: 'All' },
  ...ENQUIRY_STATUSES.map((s) => ({ value: s, label: enquiryStatusMeta(s).label })),
];

function receivedAt(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
}

/**
 * Enquiries CRM surface. Status tabs + pagination are URL-driven (server-side filtering); name/email
 * **search is client-side** within the current page (the API has no search param). Clicking a row
 * opens a right-hand drawer with the full message, contact links, and a status control that PATCHes
 * the pipeline stage (optimistic, rolls back on error).
 */
export function EnquiriesView({
  rows,
  status,
  meta,
}: {
  rows: Enquiry[];
  status: TabValue;
  meta: PageMeta;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Enquiry | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const pushParams = (changes: { status?: TabValue; page?: number }) => {
    const next = new URLSearchParams(params.toString());
    if (changes.status !== undefined) {
      if (changes.status === 'all') next.delete('status');
      else next.set('status', changes.status);
      next.delete('page');
    }
    if (changes.page !== undefined) {
      if (changes.page <= 1) next.delete('page');
      else next.set('page', String(changes.page));
    }
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (r) => r.name.toLowerCase().includes(needle) || r.email.toLowerCase().includes(needle),
    );
  }, [rows, query]);

  // Keep the open drawer in sync with freshly revalidated rows (e.g. a concurrent edit by another
  // admin). Skipped while a save is in flight so it never clobbers an in-flight optimistic update.
  useEffect(() => {
    if (!selected || saving) return;
    const fresh = rows.find((r) => r.id === selected.id);
    if (fresh && fresh.status !== selected.status) setSelected(fresh);
  }, [rows, saving, selected]);

  const changeStatus = (next: EnquiryStatus) => {
    if (!selected || saving || next === selected.status) return;
    const prev = selected;
    setStatusError(null);
    setSelected({ ...selected, status: next }); // optimistic
    startSaving(async () => {
      const result = await updateEnquiryStatus(prev.id, next);
      if (result.error) {
        setStatusError(result.error);
        setSelected(prev); // rollback
        toast.error(result.error);
      } else {
        toast.success('Status updated.');
      }
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="tablist"
          className="bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-1"
        >
          {TABS.map((t) => {
            const active = t.value === status;
            return (
              <button
                key={t.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => pushParams({ status: t.value })}
                className={cn(
                  'inline-flex h-7 cursor-pointer items-center rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors',
                  active ? 'bg-background text-foreground shadow-sm' : 'hover:text-foreground',
                )}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:max-w-xs">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or email…"
            aria-label="Search enquiries on this page"
            className="bg-background pl-8"
          />
        </div>
      </div>

      <p className="text-muted-foreground text-sm">
        {meta.total} {meta.total === 1 ? 'enquiry' : 'enquiries'}
        {status !== 'all' ? ` · ${enquiryStatusMeta(status).label.toLowerCase()}` : ''}
      </p>

      {filtered.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Inbox />
            </EmptyMedia>
            <EmptyTitle>No enquiries found</EmptyTitle>
            <EmptyDescription>
              {query
                ? 'No one on this page matches your search.'
                : 'Leads from the contact, plan-trip, and private-departure forms will appear here.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Received</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((enquiry) => (
                <TableRow
                  key={enquiry.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelected(enquiry)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelected(enquiry);
                    }
                  }}
                  className="focus-visible:bg-muted/60 cursor-pointer"
                >
                  <TableCell>
                    <span className="block font-medium">{enquiry.name}</span>
                    <span className="text-muted-foreground text-xs">{enquiry.email}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-md">
                    <span className="flex items-center gap-2">
                      {enquiry.tourId ? (
                        <Badge variant="outline" className="gap-1 whitespace-nowrap">
                          <Compass className="size-3" aria-hidden />
                          Tour
                        </Badge>
                      ) : null}
                      <span className="line-clamp-1">{enquiry.message}</span>
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground tabular-nums whitespace-nowrap">
                    {receivedAt(enquiry.createdAt)}
                  </TableCell>
                  <TableCell>
                    <EnquiryStatusBadge status={enquiry.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {meta.total > 0 ? (
        <ServerTablePagination
          page={meta.page}
          pageCount={meta.totalPages}
          total={meta.total}
          pageSize={meta.pageSize}
        />
      ) : null}

      {/* Detail drawer */}
      <Sheet
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null);
            setStatusError(null);
          }
        }}
      >
        <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
          {selected ? (
            <>
              <SheetHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <SheetTitle>{selected.name}</SheetTitle>
                  <EnquiryStatusBadge status={selected.status} />
                </div>
                <SheetDescription>Received {receivedAt(selected.createdAt)}</SheetDescription>
              </SheetHeader>

              <div className="space-y-6 px-4 pb-6">
                {/* Change status */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">Pipeline status</p>
                  <Select
                    value={selected.status}
                    onValueChange={(v) => v && changeStatus(v as EnquiryStatus)}
                  >
                    <SelectTrigger className="w-full" disabled={saving} aria-label="Change status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="start" alignItemWithTrigger={false}>
                      {ENQUIRY_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {enquiryStatusMeta(s).label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {statusError ? (
                    <p className="text-destructive text-sm" role="alert">
                      {statusError}
                    </p>
                  ) : null}
                </div>

                <Separator />

                {/* Contact */}
                <div className="space-y-3">
                  <p className="text-sm font-medium">Contact</p>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Email</dt>
                      <dd>
                        <a
                          href={`mailto:${selected.email}`}
                          className="hover:text-primary break-all hover:underline"
                        >
                          {selected.email}
                        </a>
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Phone</dt>
                      <dd>
                        {selected.phone ? (
                          <a
                            href={`tel:${selected.phone}`}
                            className="hover:text-primary hover:underline"
                          >
                            {selected.phone}
                          </a>
                        ) : (
                          '—'
                        )}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">About a tour</dt>
                      <dd>{selected.tourId ? 'Yes' : 'General enquiry'}</dd>
                    </div>
                  </dl>
                </div>

                <Separator />

                {/* Message */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">Message</p>
                  <p className="text-muted-foreground text-sm whitespace-pre-line">
                    {selected.message}
                  </p>
                </div>

                <Button
                  nativeButton={false}
                  variant="outline"
                  className="w-full"
                  render={
                    <a
                      href={`mailto:${selected.email}?subject=${encodeURIComponent('Re: your enquiry with Nexora')}`}
                    />
                  }
                >
                  Reply by email
                </Button>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default EnquiriesView;
