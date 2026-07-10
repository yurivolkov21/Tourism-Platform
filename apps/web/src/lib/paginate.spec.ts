import { pageView, pageNumbers } from './paginate';

describe('pageView', () => {
  it('derives total pages, clamped page and slice bounds', () => {
    expect(pageView(25, 1, 10)).toEqual({
      totalPages: 3,
      page: 1,
      start: 1,
      end: 10,
    });
    expect(pageView(25, 2, 10)).toEqual({
      totalPages: 3,
      page: 2,
      start: 11,
      end: 20,
    });
    expect(pageView(25, 3, 10)).toEqual({
      totalPages: 3,
      page: 3,
      start: 21,
      end: 25,
    });
  });

  it('clamps an out-of-range page into [1, totalPages]', () => {
    expect(pageView(25, 99, 10).page).toBe(3);
    expect(pageView(25, 0, 10).page).toBe(1);
    expect(pageView(25, -5, 10).page).toBe(1);
  });

  it('handles an empty set (1 page, zero bounds)', () => {
    expect(pageView(0, 1, 10)).toEqual({
      totalPages: 1,
      page: 1,
      start: 0,
      end: 0,
    });
  });

  it('handles a partial single page', () => {
    expect(pageView(7, 1, 10)).toEqual({
      totalPages: 1,
      page: 1,
      start: 1,
      end: 7,
    });
  });
});

describe('pageNumbers', () => {
  it('lists every page when there are 7 or fewer', () => {
    expect(pageNumbers(1, 1)).toEqual([1]);
    expect(pageNumbers(5, 3)).toEqual([1, 2, 3, 4, 5]);
    expect(pageNumbers(7, 4)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('collapses with a trailing ellipsis near the start', () => {
    expect(pageNumbers(10, 2)).toEqual([1, 2, 3, 'ellipsis', 10]);
  });

  it('collapses both sides around the middle', () => {
    expect(pageNumbers(10, 5)).toEqual([
      1,
      'ellipsis',
      4,
      5,
      6,
      'ellipsis',
      10,
    ]);
  });

  it('collapses with a leading ellipsis near the end', () => {
    expect(pageNumbers(10, 10)).toEqual([1, 'ellipsis', 9, 10]);
  });

  it('clamps the current page', () => {
    expect(pageNumbers(10, 99)).toEqual([1, 'ellipsis', 9, 10]);
  });
});
