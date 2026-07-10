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

/** Builds the API payload: always sends title + content; drops empty slug/excerpt; sends status if set. */
export function toPostPayload(input: PostInput): Record<string, unknown> {
  const out: Record<string, unknown> = {
    title: input.title,
    content: input.content,
  };
  for (const key of ['slug', 'excerpt'] as const) {
    const value = input[key];
    if (value && value.length > 0) out[key] = value;
  }
  if (input.status) out.status = input.status;
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
