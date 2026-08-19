// Active tour categories for the footer's "Browse tours" column. Cached (categories rarely change)
// so the global footer doesn't hit the sleepy API on every render.

import { TAGS } from '../revalidate';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

export interface FooterCategory {
  slug: string;
  name: string;
}

/** Active tour categories ordered by `order` (`GET /tour-categories`). `[]` on error. */
export async function fetchActiveCategories(): Promise<FooterCategory[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/tour-categories`, {
      // 300s backstop (was 3600) — the `categories` tag is the primary refresh.
      next: { revalidate: 300, tags: [TAGS.CATEGORIES] },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      data?: { slug: string; name: string }[];
    };
    return Array.isArray(json.data)
      ? json.data.map((c) => ({ slug: c.slug, name: c.name }))
      : [];
  } catch {
    return [];
  }
}
