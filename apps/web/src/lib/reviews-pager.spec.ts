import type { TourReview } from './tours';
import {
  MAX_INLINE_REVIEWS,
  REVIEWS_PAGE_SIZE,
  appendReviewPage,
  hasMoreReviews,
  isClamped,
  shouldShowSeeAll,
} from './reviews-pager';

function review(id: string): TourReview {
  return { id, author: 'A', date: 'May 2026', rating: 5, quote: `q-${id}` };
}

describe('constants', () => {
  it('caps inline cards at 6 and modal pages at 9', () => {
    expect(MAX_INLINE_REVIEWS).toBe(6);
    expect(REVIEWS_PAGE_SIZE).toBe(9);
  });
});

describe('shouldShowSeeAll', () => {
  it('shows only when the total exceeds the inline count', () => {
    expect(shouldShowSeeAll(7, 6)).toBe(true);
    expect(shouldShowSeeAll(6, 6)).toBe(false);
    expect(shouldShowSeeAll(0, 6)).toBe(false);
  });

  it('is false for non-finite or negative totals', () => {
    expect(shouldShowSeeAll(Number.NaN, 6)).toBe(false);
    expect(shouldShowSeeAll(-1, 6)).toBe(false);
    expect(shouldShowSeeAll(Number.POSITIVE_INFINITY, 6)).toBe(false);
  });
});

describe('appendReviewPage', () => {
  it('appends a fresh page', () => {
    const merged = appendReviewPage([review('1')], [review('2'), review('3')]);
    expect(merged.map((r) => r.id)).toEqual(['1', '2', '3']);
  });

  it('drops duplicates by id (page overlap must not duplicate cards)', () => {
    const merged = appendReviewPage(
      [review('1'), review('2')],
      [review('2'), review('3')],
    );
    expect(merged.map((r) => r.id)).toEqual(['1', '2', '3']);
  });

  it('handles an empty next page', () => {
    expect(appendReviewPage([review('1')], [])).toHaveLength(1);
  });
});

describe('hasMoreReviews', () => {
  it('is true while pages remain', () => {
    expect(hasMoreReviews(1, 2)).toBe(true);
    expect(hasMoreReviews(2, 2)).toBe(false);
  });

  it('guards bad meta', () => {
    expect(hasMoreReviews(0, 0)).toBe(false);
    expect(hasMoreReviews(1, Number.NaN)).toBe(false);
  });
});

describe('isClamped', () => {
  it('is true only when content overflows the clamp box', () => {
    expect(isClamped(200, 100)).toBe(true);
    expect(isClamped(100, 100)).toBe(false);
    expect(isClamped(80, 100)).toBe(false);
  });
});
