import { z } from 'zod';

/** Post status options (mirror the API's `PostStatus`). Reused by the form select. */
export const POST_STATUSES = ['DRAFT', 'PUBLISHED'] as const;

/**
 * Validation for the post create/edit form. Mirrors `CreatePostDto`: title 1–160, optional slug
 * (≤80, auto from title), optional excerpt (≤300), markdown `content` 1–50000, status enum.
 * `authorId`/`publishedAt` are server-owned and never in the form.
 */
export const postSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(160, 'Title must be 160 characters or fewer'),
  slug: z.string().trim().max(80, 'Slug must be 80 characters or fewer').optional(),
  excerpt: z.string().trim().max(300, 'Excerpt must be 300 characters or fewer').optional(),
  content: z
    .string()
    .trim()
    .min(1, 'Content is required')
    .max(50000, 'Content must be 50000 characters or fewer'),
  status: z.enum(POST_STATUSES).optional(),
});

export type PostInput = z.infer<typeof postSchema>;

/** Builds the API payload: always sends title + content; drops empty slug/excerpt; sends status if set. */
export function toPostPayload(input: PostInput): Record<string, unknown> {
  const out: Record<string, unknown> = { title: input.title, content: input.content };
  for (const key of ['slug', 'excerpt'] as const) {
    const value = input[key];
    if (value && value.length > 0) out[key] = value;
  }
  if (input.status) out.status = input.status;
  return out;
}
