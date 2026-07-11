import { z } from 'zod';

/** Post status options (mirror the API's `PostStatus`). Reused by the form select. */
export const POST_STATUSES = ['DRAFT', 'PUBLISHED'] as const;

/**
 * Validation for the post create/edit form. Mirrors `CreatePostDto`: title 1–160, optional slug
 * (≤80, auto from title), optional excerpt (≤300), markdown `content` 1–50000, status enum.
 * `authorId`/`publishedAt` are server-owned and never in the form.
 */
export const postSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(160, 'Title must be 160 characters or fewer'),
  slug: z
    .string()
    .trim()
    .max(80, 'Slug must be 80 characters or fewer')
    .optional(),
  excerpt: z
    .string()
    .trim()
    .max(300, 'Excerpt must be 300 characters or fewer')
    .optional(),
  content: z
    .string()
    .trim()
    .min(1, 'Content is required')
    .max(50000, 'Content must be 50000 characters or fewer'),
  status: z.enum(POST_STATUSES).optional(),
  metaTitle: z
    .string()
    .trim()
    .max(70, 'Meta title must be 70 characters or fewer')
    .optional(),
  metaDescription: z
    .string()
    .trim()
    .max(160, 'Meta description must be 160 characters or fewer')
    .optional(),
  /**
   * ISO instant computed CLIENT-SIDE from the datetime-local input (hidden
   * `publishedAtIso` field). The browser owns the local→UTC conversion — a
   * server-side `new Date("YYYY-MM-DDTHH:mm")` would use the SERVER timezone
   * (UTC on Vercel) and shift the schedule (adversarial-review finding).
   * Blank = unset.
   */
  publishedAt: z
    .string()
    .trim()
    .refine(
      (v) => v === '' || !Number.isNaN(new Date(v).getTime()),
      'Enter a valid date and time',
    )
    .optional(),
  tags: z
    .array(
      z
        .string()
        .trim()
        .min(1, 'Tags need at least one character')
        .max(60, 'Tags max 60 characters'),
    )
    .max(10, 'At most 10 tags')
    .optional(),
  relatedTourSlugs: z
    .array(z.string().trim().min(1).max(120))
    .max(3, 'At most 3 related tours')
    .optional(),
});

export type PostInput = z.infer<typeof postSchema>;

/**
 * Converts an `<input type="datetime-local">` value ("YYYY-MM-DDTHH:mm", no timezone) to an ISO
 * instant using the EXECUTING environment's timezone. CLIENT-SIDE ONLY (the post form's hidden
 * `publishedAtIso` input) — on the server this would apply the server's timezone and shift the
 * schedule. Blank/malformed → undefined.
 */
export function localDatetimeToIso(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

/**
 * Inverse of {@link localDatetimeToIso} — seeds the datetime-local input from a stored ISO value.
 * Renders the LOCAL wall-clock time (matching what the browser shows for that input type), not UTC:
 * subtract the timezone offset before slicing, so `toISOString()` reads as local time.
 */
export function isoToLocalDatetimeInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

/**
 * Builds the API payload: always sends title + content; drops empty slug/excerpt; sends status if
 * set. `mode` controls how blanked SEO overrides behave — `'create'` (default) just omits them
 * (nothing stored yet to clear); `'update'` sends `null` so a blanked field CLEARS the stored value
 * (mirrors `updateCurated` in `lib/reviews/actions.ts` — `undefined` is dropped from the JSON body
 * and would silently keep the stale value). `publishedAt` (already an ISO instant from the browser)
 * passes through; blank on `'update'` sends `null` = clear the schedule (the API re-stamps now on a
 * PUBLISHED post — "publish immediately" — and clears the date on a DRAFT).
 */
export function toPostPayload(
  input: PostInput,
  mode: 'create' | 'update' = 'create',
): Record<string, unknown> {
  const out: Record<string, unknown> = {
    title: input.title,
    content: input.content,
  };
  for (const key of ['slug', 'excerpt'] as const) {
    const value = input[key];
    if (value && value.length > 0) out[key] = value;
  }
  if (input.status) out.status = input.status;

  for (const key of ['metaTitle', 'metaDescription'] as const) {
    const value = input[key];
    if (value && value.length > 0) out[key] = value;
    else if (mode === 'update') out[key] = null;
  }

  const publishedAt = input.publishedAt?.trim() ?? '';
  if (publishedAt) out.publishedAt = publishedAt;
  else if (mode === 'update') out.publishedAt = null;

  if (input.tags !== undefined) out.tags = input.tags;
  if (input.relatedTourSlugs !== undefined)
    out.relatedTourSlugs = input.relatedTourSlugs;
  return out;
}

/** JSON `string[]` from a hidden form input; absent/blank/malformed → undefined (unsent). */
export function parseJsonStringArray(
  raw: FormDataEntryValue | null,
): string[] | undefined {
  if (typeof raw !== 'string' || raw.trim() === '') return undefined;
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.every((x) => typeof x === 'string')
      ? (parsed as string[])
      : undefined;
  } catch {
    return undefined;
  }
}
