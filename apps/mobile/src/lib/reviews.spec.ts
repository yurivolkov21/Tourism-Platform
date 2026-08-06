import { ApiRequestError } from '@tourism/core';
import { createReview, validateReviewFields } from './reviews';
import { getApiClient } from './api';

jest.mock('./api', () => ({ getApiClient: jest.fn() }));

describe('validateReviewFields', () => {
  test('valid input has no errors', () => {
    expect(
      validateReviewFields({
        rating: 5,
        title: 'Great trip',
        body: 'x'.repeat(10),
      }),
    ).toEqual({});
  });

  test.each([
    [0, 'RATING_REQUIRED'],
    [6, 'RATING_REQUIRED'],
    [3.5, 'RATING_REQUIRED'],
  ])('rating %s → %s', (rating, code) => {
    expect(
      validateReviewFields({ rating, title: '', body: 'x'.repeat(10) }).rating,
    ).toBe(code);
  });

  test.each([1, 5])('rating %s is valid', (rating) => {
    expect(
      validateReviewFields({ rating, title: '', body: 'x'.repeat(10) }).rating,
    ).toBeUndefined();
  });

  test('title exactly 120 chars is valid', () => {
    expect(
      validateReviewFields({
        rating: 5,
        title: 'x'.repeat(120),
        body: 'x'.repeat(10),
      }).title,
    ).toBeUndefined();
  });

  test('title 121 chars → TITLE_TOO_LONG', () => {
    expect(
      validateReviewFields({
        rating: 5,
        title: 'x'.repeat(121),
        body: 'x'.repeat(10),
      }).title,
    ).toBe('TITLE_TOO_LONG');
  });

  test('title omitted is valid (optional)', () => {
    expect(
      validateReviewFields({ rating: 5, title: '', body: 'x'.repeat(10) })
        .title,
    ).toBeUndefined();
  });

  test('body empty → BODY_REQUIRED', () => {
    expect(validateReviewFields({ rating: 5, title: '', body: '' }).body).toBe(
      'BODY_REQUIRED',
    );
  });

  test('whitespace-only body trims to empty → BODY_REQUIRED', () => {
    expect(
      validateReviewFields({ rating: 5, title: '', body: '   ' }).body,
    ).toBe('BODY_REQUIRED');
  });

  test('body 9 chars → BODY_TOO_SHORT', () => {
    expect(
      validateReviewFields({ rating: 5, title: '', body: 'x'.repeat(9) }).body,
    ).toBe('BODY_TOO_SHORT');
  });

  test('body 10 chars is valid', () => {
    expect(
      validateReviewFields({ rating: 5, title: '', body: 'x'.repeat(10) }).body,
    ).toBeUndefined();
  });

  test('body 2000 chars is valid', () => {
    expect(
      validateReviewFields({ rating: 5, title: '', body: 'x'.repeat(2000) })
        .body,
    ).toBeUndefined();
  });

  test('body 2001 chars → BODY_TOO_LONG', () => {
    expect(
      validateReviewFields({ rating: 5, title: '', body: 'x'.repeat(2001) })
        .body,
    ).toBe('BODY_TOO_LONG');
  });
});

describe('createReview', () => {
  test('posts the trimmed payload and returns the unwrapped review', () => {
    const POST = jest
      .fn()
      .mockResolvedValue({ data: { data: { id: 'r-1', rating: 5 } } });
    (getApiClient as jest.Mock).mockReturnValue({ POST });

    return createReview({
      bookingCode: 'BK-7Q2KX9AB',
      rating: 5,
      title: '  Great trip  ',
      body: '  Loved every minute of it.  ',
    }).then((review) => {
      expect(POST).toHaveBeenCalledWith('/api/v1/reviews', {
        body: {
          bookingCode: 'BK-7Q2KX9AB',
          rating: 5,
          title: 'Great trip',
          body: 'Loved every minute of it.',
        },
      });
      expect(review).toEqual({ id: 'r-1', rating: 5 });
    });
  });

  test('empty title trims to undefined (optional field)', async () => {
    const POST = jest
      .fn()
      .mockResolvedValue({ data: { data: { id: 'r-1', rating: 4 } } });
    (getApiClient as jest.Mock).mockReturnValue({ POST });

    await createReview({
      bookingCode: 'BK-7Q2KX9AB',
      rating: 4,
      title: '   ',
      body: 'Solid tour, would recommend.',
    });

    expect(POST.mock.calls[0][1].body.title).toBeUndefined();
  });

  test('empty response throws', async () => {
    const POST = jest.fn().mockResolvedValue({ data: {} });
    (getApiClient as jest.Mock).mockReturnValue({ POST });

    await expect(
      createReview({
        bookingCode: 'BK-7Q2KX9AB',
        rating: 5,
        title: '',
        body: 'x'.repeat(10),
      }),
    ).rejects.toThrow('empty review response');
  });

  test('propagates ApiRequestError (e.g. REVIEW_ALREADY_EXISTS)', async () => {
    const err = new ApiRequestError(409, {
      code: 'REVIEW_ALREADY_EXISTS',
      message: 'x',
    } as never);
    const POST = jest.fn().mockRejectedValue(err);
    (getApiClient as jest.Mock).mockReturnValue({ POST });

    await expect(
      createReview({
        bookingCode: 'BK-7Q2KX9AB',
        rating: 5,
        title: '',
        body: 'x'.repeat(10),
      }),
    ).rejects.toBe(err);
  });
});
