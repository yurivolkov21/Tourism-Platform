import Link from 'next/link';

import { AdminListHeader } from '../../../components/crud/list-header';
import { ErrorAlert } from '../../../components/crud/error-alert';
import { MediaLibraryView } from '../../../components/media/media-library-view';
import { apiErrorMessage } from '../../../lib/api/error';
import { listMedia, type MediaList } from '../../../lib/media-library/data';
import { parsePageSize } from '../../../lib/pagination';
import { cn } from '@tourism/ui';

const OWNER_TYPES = ['TOUR', 'DESTINATION', 'POST', 'USER'] as const;
const ROLES = ['hero', 'gallery', 'avatar'] as const;
const TYPES = ['IMAGE', 'VIDEO'] as const;

function parseChoice<T extends string>(raw: string | undefined, allowed: readonly T[]): T | undefined {
  return allowed.find((v) => v === raw);
}

function parsePage(raw?: string): number {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

interface MediaPageProps {
  searchParams: Promise<{
    tab?: string;
    page?: string;
    pageSize?: string;
    ownerType?: string;
    role?: string;
    type?: string;
    q?: string;
  }>;
}

export default async function MediaPage({ searchParams }: MediaPageProps) {
  const sp = await searchParams;
  const tab = sp.tab === 'garbage' ? 'garbage' : 'library';
  const page = parsePage(sp.page);
  const pageSize = parsePageSize(sp.pageSize);
  const ownerType = parseChoice(sp.ownerType, OWNER_TYPES);
  const role = parseChoice(sp.role, ROLES);
  const type = parseChoice(sp.type, TYPES);
  const search = sp.q?.trim() ?? '';

  let result: MediaList | undefined;
  let error: string | null = null;
  if (tab === 'library') {
    try {
      result = await listMedia({
        page,
        pageSize,
        ownerType,
        role,
        type,
        search: search || undefined,
      });
    } catch (e) {
      error = apiErrorMessage(e);
    }
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-6 lg:px-6">
      <AdminListHeader
        title="Media"
        description="Every image and video across tours, destinations and posts. Search, inspect, and remove media; the Garbage tab shows the deferred Cloudinary cleanup queue."
      />

      <div className="flex items-center gap-1">
        {[
          { key: 'library', label: 'Library', href: '/media' },
          { key: 'garbage', label: 'Garbage', href: '/media?tab=garbage' },
        ].map((t) => (
          <Link
            key={t.key}
            href={t.href}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              tab === t.key
                ? 'bg-secondary text-secondary-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === 'library' && error ? (
        <ErrorAlert>
          Couldn&apos;t load media: {error}. Check that the API is running and your admin session is
          valid.
        </ErrorAlert>
      ) : tab === 'library' ? (
        <MediaLibraryView
          rows={result?.data ?? []}
          meta={result?.meta}
          ownerType={ownerType}
          role={role}
          type={type}
          search={search}
        />
      ) : (
        <div /> /* Garbage tab content lands in the next task. */
      )}
    </div>
  );
}
