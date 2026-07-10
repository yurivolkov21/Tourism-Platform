/** Pure pagination math for the client-side tours listing (filter/sort/search run client-side, so
 * paging slices the already-computed result set). No I/O — unit-tested directly. */

export interface PageView {
  /** Total pages for the result set (≥1, even when empty). */
  totalPages: number;
  /** The requested page clamped into `[1, totalPages]`. */
  page: number;
  /** 1-based index of the first item shown (0 when the set is empty). */
  start: number;
  /** 1-based index of the last item shown (0 when the set is empty). */
  end: number;
}

/** Clamp a page request to a result set and derive the visible slice bounds. */
export function pageView(
  total: number,
  page: number,
  pageSize: number,
): PageView {
  const size = Math.max(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(total / size));
  const clamped = Math.min(Math.max(1, Math.trunc(page) || 1), totalPages);
  const start = total === 0 ? 0 : (clamped - 1) * size + 1;
  const end = Math.min(clamped * size, total);
  return { totalPages, page: clamped, start, end };
}

function range(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

/**
 * Page-number buttons to render, with `'ellipsis'` markers for collapsed gaps. Shows the first and
 * last page always, plus the current page ±1; ≤7 pages render in full.
 */
export function pageNumbers(
  totalPages: number,
  current: number,
): (number | 'ellipsis')[] {
  const total = Math.max(1, totalPages);
  const cur = Math.min(Math.max(1, current), total);
  if (total <= 7) return range(1, total);

  const left = Math.max(2, cur - 1);
  const right = Math.min(total - 1, cur + 1);
  const pages: (number | 'ellipsis')[] = [1];
  if (left > 2) pages.push('ellipsis');
  pages.push(...range(left, right));
  if (right < total - 1) pages.push('ellipsis');
  pages.push(total);
  return pages;
}
