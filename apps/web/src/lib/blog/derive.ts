/**
 * Derived, display-only facts computed from a post's Markdown `content`. Pure — no fetches;
 * ported from the admin post rail (`apps/admin/src/lib/posts/derive.ts`) with heading anchor
 * ids added so the reader page's outline links land on the rendered headings.
 */

const WORDS_PER_MINUTE = 200;
const MAX_OUTLINE = 12;

export interface ReadingStats {
  words: number;
  minutes: number;
}

/** Word count + reading minutes (~200 wpm, floored at 1 for any non-empty post). */
export function readingStats(content: string): ReadingStats {
  const plain = content
    .replace(/```[\s\S]*?```/g, ' ') // fenced code blocks
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links → their text
    .replace(/[#>*_~`|-]+/g, ' '); // markdown syntax chars
  const words = plain.split(/\s+/).filter(Boolean).length;
  const minutes = words === 0 ? 0 : Math.max(1, Math.round(words / WORDS_PER_MINUTE));
  return { words, minutes };
}

/**
 * Anchor id for a heading — the SINGLE slugify shared by the outline links and the rendered
 * headings' `id`s (one source, or anchors silently miss). Diacritics are stripped so
 * Vietnamese headings produce stable ASCII ids.
 */
export function slugifyHeading(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export interface OutlineItem {
  depth: 2 | 3;
  text: string;
  /** Anchor id — matches the rendered heading's `id` (same slugify). */
  id: string;
}

/** `#`/`##`/`###` headings outside code fences (`#` normalizes to depth 2). Caps at 12 items. */
export function extractOutline(content: string): OutlineItem[] {
  const noFences = content.replace(/```[\s\S]*?```/g, '');
  const out: OutlineItem[] = [];
  for (const line of noFences.split('\n')) {
    const m = /^(#{1,3})\s+(.+?)\s*#*\s*$/.exec(line.trim());
    if (!m) continue;
    const text = m[2].trim();
    out.push({ depth: m[1].length >= 3 ? 3 : 2, text, id: slugifyHeading(text) });
    if (out.length >= MAX_OUTLINE) break;
  }
  return out;
}
