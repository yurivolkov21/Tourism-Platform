/**
 * Normalises arbitrary admin input ("Hội An 2024", "ĐÀ NẴNG / Huế", …) into the
 * canonical kebab slug (`/^[a-z0-9]+(?:-[a-z0-9]+)*$/`).
 *
 * 1. NFD-decompose + strip combining diacritics (ấ → a, ữ → u …).
 * 2. Map đ/Đ → d explicitly — they're standalone letters, not base+combining,
 *    so NFD leaves them untouched (Vietnamese gotcha).
 * 3. Lowercase, collapse non-alphanumeric runs to a single hyphen, trim hyphens.
 *
 * Symbol-only input yields `''` — the caller decides to fall back or reject.
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
