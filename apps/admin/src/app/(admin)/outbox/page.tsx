import Link from 'next/link';

import { AdminListHeader } from '../../../components/crud/list-header';
import { ErrorAlert } from '../../../components/crud/error-alert';
import { OutboxView } from '../../../components/outbox/outbox-view';
import { apiErrorMessage } from '../../../lib/api/error';
import { listOutbox, type OutboxList } from '../../../lib/outbox/data';
import { parsePageSize } from '../../../lib/pagination';
import { cn } from '@tourism/ui';

const STATUSES = ['PENDING', 'SENT', 'FAILED'] as const;
type OutboxStatus = (typeof STATUSES)[number];

function parseStatus(raw?: string): OutboxStatus | undefined {
  return STATUSES.find((s) => s === raw);
}

function parsePage(raw?: string): number {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

interface OutboxPageProps {
  searchParams: Promise<{
    status?: string;
    page?: string;
    pageSize?: string;
  }>;
}

export default async function OutboxPage({ searchParams }: OutboxPageProps) {
  const sp = await searchParams;
  const status = parseStatus(sp.status);
  const page = parsePage(sp.page);
  const pageSize = parsePageSize(sp.pageSize);

  let result: OutboxList | undefined;
  let error: string | null = null;
  try {
    result = await listOutbox({ page, pageSize, status });
  } catch (e) {
    error = apiErrorMessage(e);
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-6 lg:px-6">
      <AdminListHeader
        title="Email queue"
        description="Transactional emails queued by bookings, reviews and enquiries. PENDING sends on the next 1-minute pass; FAILED rows parked after 5 attempts can be retried here."
      />

      {/* Status tabs styled as the shared segmented tablist (matches every other admin list). */}
      <div
        role="tablist"
        className="bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-1"
      >
        {[
          { key: undefined, label: 'All', href: '/outbox' },
          { key: 'PENDING', label: 'Pending', href: '/outbox?status=PENDING' },
          { key: 'SENT', label: 'Sent', href: '/outbox?status=SENT' },
          { key: 'FAILED', label: 'Failed', href: '/outbox?status=FAILED' },
        ].map((t) => {
          const active = status === t.key;
          return (
            <Link
              key={t.label}
              href={t.href}
              role="tab"
              aria-selected={active}
              className={cn(
                'inline-flex h-7 items-center gap-1.5 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors',
                active ? 'bg-background text-foreground shadow-sm' : 'hover:text-foreground',
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {error ? (
        <ErrorAlert>
          Couldn&apos;t load the email queue: {error}. Check that the API is running and your admin
          session is valid.
        </ErrorAlert>
      ) : (
        <OutboxView rows={result?.data ?? []} meta={result?.meta} />
      )}
    </div>
  );
}
