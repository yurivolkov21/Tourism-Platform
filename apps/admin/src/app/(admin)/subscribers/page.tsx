import { AdminListHeader } from '../../../components/crud/list-header';
import { ErrorAlert } from '../../../components/crud/error-alert';
import { SubscribersView } from '../../../components/subscribers/subscribers-view';
import { apiErrorMessage } from '../../../lib/api/error';
import { parsePageSize } from '../../../lib/pagination';
import {
  listSubscribers,
  type SubscriberList,
} from '../../../lib/subscribers/data';

function parsePage(raw?: string): number {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

interface SubscribersPageProps {
  searchParams: Promise<{ page?: string; pageSize?: string; q?: string }>;
}

export default async function SubscribersPage({
  searchParams,
}: SubscribersPageProps) {
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const pageSize = parsePageSize(sp.pageSize);
  const search = sp.q?.trim() ?? '';

  let result: SubscriberList | undefined;
  let error: string | null = null;
  try {
    result = await listSubscribers({
      page,
      pageSize,
      search: search || undefined,
    });
  } catch (e) {
    error = apiErrorMessage(e);
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-6 lg:px-6">
      <AdminListHeader
        title="Subscribers"
        description="Newsletter signups from the website footer. Export the list as CSV to hand to an email provider."
      />

      {error ? (
        <ErrorAlert>
          Couldn&apos;t load subscribers: {error}. Check that the API is running
          and your admin session is valid.
        </ErrorAlert>
      ) : (
        <SubscribersView
          rows={result?.data ?? []}
          meta={result?.meta}
          search={search}
        />
      )}
    </div>
  );
}
