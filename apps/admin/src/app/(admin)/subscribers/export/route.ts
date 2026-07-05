import { toCsv } from '../../../../lib/subscribers/csv';
import { listSubscribers, type Subscriber } from '../../../../lib/subscribers/data';

/** Server-side page-through cap — 100 pages × 100 rows = 10k subscribers, plenty for an export. */
const PAGE_SIZE = 100;
const MAX_PAGES = 100;

/**
 * Streams every subscriber as a CSV attachment. Runs server-side with the
 * admin's session (the same authed `listSubscribers` the page uses), paging
 * until the list is exhausted.
 */
export async function GET(): Promise<Response> {
  const rows: Subscriber[] = [];
  try {
    for (let page = 1; page <= MAX_PAGES; page += 1) {
      const batch = await listSubscribers({ page, pageSize: PAGE_SIZE });
      rows.push(...batch.data);
      if (page >= batch.meta.totalPages) break;
    }
  } catch {
    return new Response('Could not load subscribers — is your admin session valid?', {
      status: 502,
    });
  }

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(toCsv(rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="subscribers-${stamp}.csv"`,
    },
  });
}
