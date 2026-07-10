import type { TrustStats } from '../trust-band';
import { getApiClient } from './client';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

async function count(
  path: '/api/v1/tours' | '/api/v1/destinations',
): Promise<number> {
  const api = getApiClient();
  const { data } = await api.GET(path, { params: { query: { pageSize: 1 } } });
  return (data as unknown as { meta?: { total?: number } }).meta?.total ?? 0;
}

async function reviewSummary(): Promise<{
  count: number;
  averageRating: number | null;
}> {
  const res = await fetch(`${API_BASE}/api/v1/reviews/summary`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) return { count: 0, averageRating: null };
  const json = (await res.json()) as {
    data?: { count?: number; averageRating?: number | null };
  };
  return {
    count: json.data?.count ?? 0,
    averageRating: json.data?.averageRating ?? null,
  };
}

/** Live trust-band numbers. Returns zeros/null on any error so the band never breaks the page. */
export async function fetchTrustStats(): Promise<TrustStats> {
  try {
    const [tours, destinations, reviews] = await Promise.all([
      count('/api/v1/tours'),
      count('/api/v1/destinations'),
      reviewSummary(),
    ]);
    return {
      tours,
      destinations,
      reviewCount: reviews.count,
      averageRating: reviews.averageRating,
    };
  } catch {
    return { tours: 0, destinations: 0, reviewCount: 0, averageRating: null };
  }
}
