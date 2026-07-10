// Public reviews reads for the marketing site. The typed OpenAPI client doesn't carry the freshly
// added `/reviews/featured` route yet, so this uses a plain fetch against the same API origin.

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

export interface FeaturedReview {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  authorName: string;
  authorLocation: string | null;
  tripLabel: string | null;
  createdAt: string;
}

/** Featured testimonials for the homepage carousel (`GET /reviews/featured`). `[]` on error. */
export async function fetchFeaturedReviews(): Promise<FeaturedReview[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/reviews/featured`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: FeaturedReview[] };
    return Array.isArray(json.data) ? json.data : [];
  } catch {
    return [];
  }
}
