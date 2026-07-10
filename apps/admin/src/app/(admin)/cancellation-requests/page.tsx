import { AdminListHeader } from '../../../components/crud/list-header';
import { ErrorAlert } from '../../../components/crud/error-alert';
import { CancellationRequestsView } from '../../../components/cancellation-requests/cancellation-requests-view';
import { apiErrorMessage } from '../../../lib/api/error';
import { parsePageSize } from '../../../lib/pagination';
import {
  listCancellationRequests,
  type CancellationRequestList,
} from '../../../lib/cancellation-requests/data';

function parsePage(raw?: string): number {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

interface CancellationRequestsPageProps {
  searchParams: Promise<{ page?: string; pageSize?: string }>;
}

export default async function CancellationRequestsPage({
  searchParams,
}: CancellationRequestsPageProps) {
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const pageSize = parsePageSize(sp.pageSize);

  let result: CancellationRequestList | undefined;
  let error: string | null = null;
  try {
    result = await listCancellationRequests({ page, pageSize });
  } catch (e) {
    error = apiErrorMessage(e);
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-6 lg:px-6">
      <AdminListHeader
        title="Cancellation requests"
        description="Customer-initiated cancellations awaiting a decision. Review each on the booking detail page to refund or deny."
      />

      {error ? (
        <ErrorAlert>
          Couldn&apos;t load cancellation requests: {error}. Check that the API
          is running and your admin session is valid.
        </ErrorAlert>
      ) : (
        <CancellationRequestsView
          rows={result?.data ?? []}
          meta={result?.meta}
        />
      )}
    </div>
  );
}
