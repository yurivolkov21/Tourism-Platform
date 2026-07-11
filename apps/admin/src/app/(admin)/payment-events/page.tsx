import { apiErrorMessage } from '../../../lib/api/error';
import { AdminListHeader } from '../../../components/crud/list-header';
import { ErrorAlert } from '../../../components/crud/error-alert';
import { ServerTablePagination } from '../../../components/crud/server-table-pagination';
import { PaymentEventsView } from '../../../components/payment-events/payment-events-view';
import {
  listPaymentEvents,
  type PaymentEventList,
  type PaymentEventProvider,
} from '../../../lib/payment-events/data';
import { parsePageSize } from '../../../lib/pagination';

const PROVIDERS: PaymentEventProvider[] = ['STRIPE', 'PAYPAL'];

/** Narrows a raw `?provider=` value to a valid enum member (or undefined = all). */
function parseProvider(raw?: string): PaymentEventProvider | undefined {
  return PROVIDERS.find((p) => p === raw);
}

/** Narrows a raw `?page=` value to a positive integer (defaults to 1). */
function parsePage(raw?: string): number {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

interface PaymentEventsPageProps {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    provider?: string;
    type?: string;
    q?: string;
  }>;
}

export default async function PaymentEventsPage({
  searchParams,
}: PaymentEventsPageProps) {
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const pageSize = parsePageSize(sp.pageSize);
  const provider = parseProvider(sp.provider);
  const type = sp.type?.trim() ?? '';
  const search = sp.q?.trim() ?? '';

  let result: PaymentEventList | undefined;
  let error: string | null = null;
  try {
    result = await listPaymentEvents({
      page,
      pageSize,
      provider,
      type: type || undefined,
      search: search || undefined,
    });
  } catch (e) {
    error = apiErrorMessage(e);
  }

  const rows = result?.data ?? [];
  const meta = result?.meta;

  return (
    <div className="flex flex-col gap-6 px-4 py-6 lg:px-6">
      <AdminListHeader
        title="Payment events"
        description="Every Stripe and PayPal webhook the API has received — filter by provider or search an event id, and open a row to see the raw payload and its booking."
      />

      <div className="flex flex-col gap-4">
        {error ? (
          <ErrorAlert>
            Couldn&apos;t load payment events: {error}. Check that the API is
            running and your admin session is valid.
          </ErrorAlert>
        ) : (
          <>
            <PaymentEventsView
              rows={rows}
              provider={provider}
              type={type}
              search={search}
            />
            {meta && meta.total > 0 ? (
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
    </div>
  );
}
