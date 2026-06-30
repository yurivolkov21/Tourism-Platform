/**
 * Mirror of the API's `slugify` (apps/api/src/common/slugify.ts): NFD-decompose, strip combining
 * diacritics, đ→d, lowercase, collapse non-alphanumerics to hyphens, trim. Used in admin forms to
 * preview the slug the server will store (the server re-normalises, so this is for UX consistency).
 *
 * Example: "Hội An" → "hoi-an", "Đà Nẵng" → "da-nang".
 */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
