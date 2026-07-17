import { formatReviewDate, toTourReview } from './review-mapper';

describe('formatReviewDate', () => {
  it('renders "Mon YYYY"', () => {
    expect(formatReviewDate('2026-05-12T00:00:00Z')).toBe('May 2026');
  });

  it('returns an empty string for a bad value', () => {
    expect(formatReviewDate('not-a-date')).toBe('');
    expect(formatReviewDate('')).toBe('');
  });
});

describe('toTourReview', () => {
  it('maps the PII-stripped DTO to the view-model', () => {
    expect(
      toTourReview({
        id: 'r-1',
        rating: 4,
        title: 'Nice',
        body: 'Great trip.',
        createdAt: '2026-05-12T00:00:00Z',
        reviewer: { fullName: 'Alice' },
      } as never),
    ).toEqual({
      id: 'r-1',
      author: 'Alice',
      date: 'May 2026',
      rating: 4,
      quote: 'Great trip.',
    });
  });
});
