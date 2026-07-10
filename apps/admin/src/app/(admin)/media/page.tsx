import Link from 'next/link';

import { AdminListHeader } from '../../../components/crud/list-header';
import { ErrorAlert } from '../../../components/crud/error-alert';
import { MediaLibraryView } from '../../../components/media/media-library-view';
import { GarbageView } from '../../../components/media/garbage-view';
import { apiErrorMessage } from '../../../lib/api/error';
import {
  listMedia,
  listGarbage,
  type MediaList,
  type GarbageList,
} from '../../../lib/media-library/data';
import { parsePageSize } from '../../../lib/pagination';
import { cn } from '@tourism/ui';

const OWNER_TYPES = ['TOUR', 'DESTINATION', 'POST', 'USER'] as const;
const ROLES = ['hero', 'gallery', 'avatar', 'body'] as const;
const TYPES = ['IMAGE', 'VIDEO'] as const;

function parseChoice<T extends string>(
  raw: string | undefined,
  allowed: readonly T[],
): T | undefined {
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
  let garbage: GarbageList | undefined;
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
  } else if (tab === 'garbage') {
    try {
      garbage = await listGarbage({ page, pageSize });
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

      {/* View tabs styled as the shared segmented tablist (matches every other admin list). */}
      <div
        role="tablist"
        className="bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-1"
      >
        {[
          { key: 'library', label: 'Library', href: '/media' },
          { key: 'garbage', label: 'Garbage', href: '/media?tab=garbage' },
        ].map((t) => {
          const active = tab === t.key;
          return (
            <Link
              key={t.key}
              href={t.href}
              role="tab"
              aria-selected={active}
              className={cn(
                'inline-flex h-7 items-center gap-1.5 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors',
                active
                  ? 'bg-background text-foreground shadow-sm'
                  : 'hover:text-foreground',
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {error ? (
        <ErrorAlert>
          Couldn&apos;t load media: {error}. Check that the API is running and
          your admin session is valid.
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
        <GarbageView rows={garbage?.data ?? []} meta={garbage?.meta} />
      )}
    </div>
  );
}
