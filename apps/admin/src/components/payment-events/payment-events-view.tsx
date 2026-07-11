'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, ListFilter, Search, Webhook } from 'lucide-react';
import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';

import {
  Badge,
  Button,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  Input,
  Separator,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@tourism/ui';

import { FacetFilter } from '../crud/facet-filter';
import { ColumnsMenu } from '../crud/columns-menu';
import { usePersistentColumnVisibility } from '../crud/use-persistent-column-visibility';
import { AdminTableShell } from '../crud/admin-table-shell';
import { formatRelativeTime } from '../../lib/relative-time';
import type {
  AdminPaymentEvent,
  PaymentEventProvider,
} from '../../lib/payment-events/data';

const SEARCH_DEBOUNCE_MS = 350;

const PROVIDER_OPTIONS: { value: PaymentEventProvider; label: string }[] = [
  { value: 'STRIPE', label: 'Stripe' },
  { value: 'PAYPAL', label: 'PayPal' },
];

/** Absolute date + time (`5 Jul 2026, 14:32`), `—` on unparsable input. */
function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
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

function ProviderBadge({ provider }: { provider: PaymentEventProvider }) {
  return (
    <Badge variant={provider === 'STRIPE' ? 'default' : 'secondary'}>
      {provider === 'STRIPE' ? 'Stripe' : 'PayPal'}
    </Badge>
  );
}

/** Copies a value to the clipboard, with a brief check-mark confirmation (mirrors `CopyCodeButton`). */
function CopyValue({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — no-op */
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={() => void copy()}
      aria-label={copied ? `${label} copied` : `Copy ${label.toLowerCase()}`}
      className="text-muted-foreground hover:text-foreground cursor-pointer"
    >
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
    </Button>
  );
}

/**
 * Payment-events debugging table on the shared admin stack (FacetFilter + ColumnsMenu +
 * AdminTableShell + ServerTablePagination, the Bookings/Reviews pattern) with a right-hand drawer
 * showing the parsed facts plus the raw provider payload — admin-only, so the payload (never shown
 * on the booking detail embed) is fair game here.
 */
export function PaymentEventsView({
  rows,
  provider,
  type,
  search,
}: {
  rows: AdminPaymentEvent[];
  provider?: PaymentEventProvider;
  /** `type` contains-filter carried in the URL for deep-linking; no toolbar control (yet). */
  type: string;
  search: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [query, setQuery] = useState(search);
  const firstRender = useRef(true);
  const [columnVisibility, setColumnVisibility] =
    usePersistentColumnVisibility('payment-events');
  const [selected, setSelected] = useState<AdminPaymentEvent | null>(null);

  /** Build the next URL from a partial change (`null`/`undefined` value deletes), always resetting `page`. */
  const pushWith = (changes: {
    provider?: PaymentEventProvider | null;
    q?: string;
  }) => {
    const next = new URLSearchParams(params.toString());
    if (changes.provider !== undefined) {
      if (changes.provider) next.set('provider', changes.provider);
      else next.delete('provider');
    }
    if (changes.q !== undefined) {
      if (changes.q.trim()) next.set('q', changes.q.trim());
      else next.delete('q');
    }
    next.delete('page');
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  // Keep the input in sync when the URL changes underneath it (back/forward,
  // chip clears) — without this the box shows a stale term after navigation.
  useEffect(() => {
    setQuery(search);
  }, [search]);

  // Debounce the search box → URL. Skip the initial mount so we don't re-push
  // on load. `params` is in the deps so a facet navigation rebuilds the
  // pending timer with a fresh URL snapshot — a stale closure here would push
  // a URL that silently drops the just-applied filter.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const id = setTimeout(() => {
      if (query !== search) pushWith({ q: query });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [query, search, params]);

  const columns = useMemo<ColumnDef<AdminPaymentEvent>[]>(
    () => [
      {
        id: 'received',
        header: 'Received',
        enableHiding: false,
        meta: { label: 'Received' },
        cell: ({ row }) => (
          <div>
            <span className="block whitespace-nowrap">
              {formatDateTime(row.original.receivedAt)}
            </span>
            <span className="text-muted-foreground text-xs">
              {formatRelativeTime(row.original.receivedAt)}
            </span>
          </div>
        ),
      },
      {
        id: 'provider',
        header: 'Provider',
        meta: { label: 'Provider' },
        cell: ({ row }) => <ProviderBadge provider={row.original.provider} />,
      },
      {
        id: 'type',
        header: 'Type',
        meta: { label: 'Type' },
        cell: ({ row }) => (
          <span
            className="block max-w-56 truncate font-mono text-xs"
            title={row.original.type}
          >
            {row.original.type}
          </span>
        ),
      },
      {
        id: 'eventId',
        header: 'Event ID',
        meta: { label: 'Event ID' },
        cell: ({ row }) => (
          <span
            className="block max-w-40 truncate font-mono text-xs"
            title={row.original.eventId}
          >
            {row.original.eventId}
          </span>
        ),
      },
      {
        id: 'booking',
        header: 'Booking',
        meta: { label: 'Booking' },
        cell: ({ row }) => {
          const code = row.original.bookingCode;
          if (!code) return <span className="text-muted-foreground">—</span>;
          return (
            <Link
              href={`/bookings/${code}`}
              onClick={(e) => e.stopPropagation()}
              className="hover:text-primary font-mono text-xs hover:underline"
            >
              {code}
            </Link>
          );
        },
      },
      {
        id: 'processed',
        header: 'Processed',
        meta: { label: 'Processed' },
        cell: ({ row }) =>
          row.original.processedAt ? (
            <span className="text-muted-foreground text-xs whitespace-nowrap">
              <Check className="mr-1 inline size-3.5" aria-hidden />
              {formatDateTime(row.original.processedAt)}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { columnVisibility },
    manualPagination: true,
    manualFiltering: true,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
  });

  const providerLabel = provider
    ? (PROVIDER_OPTIONS.find((p) => p.value === provider)?.label ??
      '1 provider')
    : 'All providers';

  const filtered = Boolean(provider || type || search);

  const clearTypeHref = (() => {
    const next = new URLSearchParams(params.toString());
    next.delete('type');
    next.delete('page');
    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  })();

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {type ? (
          <p className="text-muted-foreground text-sm">
            Filtered to type containing &ldquo;{type}&rdquo; —{' '}
            <Link href={clearTypeHref} className="text-primary hover:underline">
              Clear
            </Link>
          </p>
        ) : (
          <div />
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <FacetFilter
            label="Filter by provider"
            icon={ListFilter}
            triggerLabel={providerLabel}
            options={PROVIDER_OPTIONS}
            selected={provider ? [provider] : []}
            onToggle={(value, checked) =>
              pushWith({
                provider: checked ? (value as PaymentEventProvider) : null,
              })
            }
            onClear={() => pushWith({ provider: null })}
            contentClassName="w-44"
          />
          <div className="relative w-full sm:max-w-xs">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search event id…"
              aria-label="Search payment events by event id"
              className="bg-background pl-8"
            />
          </div>
          <ColumnsMenu table={table} />
        </div>
      </div>

      {rows.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Webhook />
            </EmptyMedia>
            <EmptyTitle>
              {filtered
                ? 'No payment events match your filters'
                : 'No payment events yet'}
            </EmptyTitle>
            <EmptyDescription>
              {filtered
                ? 'Try a different provider or search term, or clear the filters to see them all.'
                : 'Stripe and PayPal webhooks will appear here as they arrive.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <AdminTableShell table={table} onRowClick={setSelected} />
      )}

      {/* Payload drawer */}
      <Sheet
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-lg">
          {selected ? (
            <>
              <SheetHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <SheetTitle className="font-mono text-base">
                    {selected.type}
                  </SheetTitle>
                  <ProviderBadge provider={selected.provider} />
                </div>
                <SheetDescription>
                  Received {formatDateTime(selected.receivedAt)}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6 px-4 pb-6">
                <dl className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-muted-foreground">Event ID</dt>
                    <dd className="flex items-center gap-1">
                      <span className="max-w-52 truncate font-mono text-xs">
                        {selected.eventId}
                      </span>
                      <CopyValue value={selected.eventId} label="Event ID" />
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Processed</dt>
                    <dd>
                      {selected.processedAt
                        ? formatDateTime(selected.processedAt)
                        : 'Not yet'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Booking</dt>
                    <dd className="text-right">
                      {selected.bookingCode ? (
                        <Link
                          href={`/bookings/${selected.bookingCode}`}
                          className="hover:text-primary font-mono hover:underline"
                        >
                          {selected.bookingCode}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </dd>
                  </div>
                </dl>

                <Separator />

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Payload</p>
                    <CopyValue
                      value={JSON.stringify(selected.payload, null, 2)}
                      label="Payload"
                    />
                  </div>
                  <pre className="bg-muted max-h-96 overflow-auto rounded-md p-3 text-xs">
                    {JSON.stringify(selected.payload, null, 2)}
                  </pre>
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default PaymentEventsView;
