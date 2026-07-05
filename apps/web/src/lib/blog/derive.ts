/**
 * Derived, display-only facts computed from a post's Markdown `content`. Pure — no fetches;
 * ported from the admin post rail (`apps/admin/src/lib/posts/derive.ts`) with heading anchor
 * ids added so the reader page's outline links land on the rendered headings.
 */

import { stripInlineMarkdown, stripMarkdownSyntax } from './strip-markdown';

const WORDS_PER_MINUTE = 200;
const MAX_OUTLINE = 12;

export interface ReadingStats {
  words: number;
  minutes: number;
}

/** Word count + reading minutes (~200 wpm, floored at 1 for any non-empty post). */
export function readingStats(content: string): ReadingStats {
  const words = stripMarkdownSyntax(content).split(/\s+/).filter(Boolean).length;
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
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const MEANINGFUL_UPDATE_MS = 24 * 60 * 60 * 1000;

/**
 * True when a post was edited long enough after publishing (> 24 h, user decision
 * 2026-07-05) that an "Updated on …" stamp is honest rather than same-day-typo noise.
 * Null/unparsable dates → false.
 */
export function isMeaningfullyUpdated(
  publishedAt: string | null,
  updatedAt: string | null,
): boolean {
  if (!publishedAt || !updatedAt) return false;
  const published = Date.parse(publishedAt);
  const updated = Date.parse(updatedAt);
  if (Number.isNaN(published) || Number.isNaN(updated)) return false;
  return updated - published > MEANINGFUL_UPDATE_MS;
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
    // Strip inline markdown so text + id match the RENDERED heading (whose id is built
    // from react-markdown's flattened children — a link contributes only its text).
    const text = stripInlineMarkdown(m[2].trim());
    out.push({ depth: m[1].length >= 3 ? 3 : 2, text, id: slugifyHeading(text) });
    if (out.length >= MAX_OUTLINE) break;
  }
  return out;
}
