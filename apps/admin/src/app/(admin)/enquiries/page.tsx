import { apiErrorMessage } from '../../../lib/api/error';
import { AdminListHeader } from '../../../components/crud/list-header';
import { EnquiriesView } from '../../../components/enquiries/enquiries-view';
import { listEnquiries, type EnquiryList } from '../../../lib/enquiries/data';
import { ENQUIRY_STATUSES, type EnquiryStatus } from '../../../lib/enquiries/status';
import { ErrorAlert } from '../../../components/crud/error-alert';
import { parsePageSize } from '../../../lib/pagination';

/** Narrows a raw `?status=` value to a valid pipeline stage (or undefined = all). */
function parseStatus(raw?: string): EnquiryStatus | undefined {
  return ENQUIRY_STATUSES.find((s) => s === raw);
}

/** Narrows a raw `?page=` value to a positive integer (defaults to 1). */
function parsePage(raw?: string): number {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

interface EnquiriesPageProps {
  searchParams: Promise<{ status?: string; page?: string; pageSize?: string }>;
}

export default async function EnquiriesPage({ searchParams }: EnquiriesPageProps) {
  const sp = await searchParams;
  const status = parseStatus(sp.status);
  const page = parsePage(sp.page);
  const pageSize = parsePageSize(sp.pageSize);

  let result: EnquiryList | undefined;
  let error: string | null = null;
  try {
    result = await listEnquiries({ page, pageSize, status });
  } catch (e) {
    error = apiErrorMessage(e);
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-6 lg:px-6">
      <AdminListHeader
        title="Enquiries"
        description="Leads from the contact, plan-a-trip, and private-departure forms. Filter by pipeline stage; open one to read the full message and move it along."
      />

      {error ? (
        <ErrorAlert>
          Couldn&apos;t load enquiries: {error}. Check that the API is running and your admin session
          is valid.
        </ErrorAlert>
      ) : result ? (
        <EnquiriesView rows={result.data} status={status ?? 'all'} meta={result.meta} />
      ) : null}
    </div>
  );
}
