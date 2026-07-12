import { AdminListHeader } from '../../../components/crud/list-header';
import { ErrorAlert } from '../../../components/crud/error-alert';
import { TabPills } from '../../../components/crud/tab-pills';
import { MediaLibraryView } from '../../../components/media/media-library-view';
import { GarbageView } from '../../../components/media/garbage-view';
import { apiErrorMessage } from '../../../lib/api/error';
import {
  listMedia,
  listGarbage,
  type MediaList,
  type GarbageList,
} from '../../../lib/media-library/data';
import { excludeUserOwnedFor } from '../../../lib/media-library/query';
import { parsePageSize } from '../../../lib/pagination';

const OWNER_TYPES = ['TOUR', 'DESTINATION', 'POST', 'USER', 'SITE'] as const;
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
        excludeUserOwned: excludeUserOwnedFor(ownerType, role),
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
        description="Every image and video across tours, destinations, posts and site chrome. Customer avatars stay out of this view by default — pick the User avatars facet to moderate them. The Garbage tab shows the deferred Cloudinary cleanup queue."
      />

      {/* View tabs styled as the shared segmented tablist (matches every other admin list). */}
      <TabPills
        tabs={[
          { value: 'library', label: 'Library' },
          { value: 'garbage', label: 'Garbage' },
        ]}
        value={tab}
        hrefFor={(v) => (v === 'garbage' ? '/media?tab=garbage' : '/media')}
      />

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
