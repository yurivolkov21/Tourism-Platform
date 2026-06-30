/** Shape of the `@tourism/core` `ApiRequestError` (duck-typed so we don't depend on the class). */
interface ApiErrorLike {
  name: string;
  status: number;
  code: string;
  message: string;
}

function isApiError(error: unknown): error is ApiErrorLike {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { name?: unknown }).name === 'ApiRequestError' &&
    typeof (error as { status?: unknown }).status === 'number'
  );
}

/**
 * Maps an API failure to a short, friendly English message. Handles the `@tourism/core`
 * `ApiRequestError` by HTTP status (403 not-admin, 409 conflict, 404, 401 session), and falls back
 * to the raw message for everything else.
 */
const FRIENDLY_409: Record<string, string> = {
  DESTINATION_IS_ACTIVE:
    'This destination is still active. Turn off “Active” (set it to Draft) first, then you can delete it.',
  DESTINATION_HAS_TOURS:
    'This destination still has tours attached. Move or remove those tours first, then you can delete it.',
  CATEGORY_IS_ACTIVE:
    'This category is still active. Turn off “Active” (set it to Draft) first, then you can delete it.',
  CATEGORY_HAS_TOURS:
    'This category still has tours in it. Move those tours to another category first, then you can delete it.',
  TOUR_IS_PUBLISHED: 'This tour is still published. Unpublish it first, then you can delete it.',
  TOUR_HAS_BOOKINGS: 'This tour has bookings, so it can’t be deleted.',
  DEPARTURE_HAS_BOOKINGS: 'This departure has bookings, so it can’t be deleted.',
  DESTINATION_SLUG_EXISTS:
    'That URL slug is already used by another destination. Please choose a different one.',
  CATEGORY_SLUG_EXISTS:
    'That URL slug is already used by another category. Please choose a different one.',
  TOUR_SLUG_EXISTS: 'That URL slug is already used by another tour. Please choose a different one.',
  POST_SLUG_EXISTS: 'That URL slug is already used by another post. Please choose a different one.',
};

/**
 * Maps an API failure to a short, friendly English message. For 409 conflicts it prefers a
 * plain-language message keyed by the API `code` (the raw backend messages are developer-flavoured).
 */
export function apiErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    switch (error.status) {
      case 401:
        return 'Your session has expired. Please sign in again.';
      case 403:
        return 'Your account is not authorized for the admin console.';
      case 404:
        return 'That record no longer exists.';
      case 409:
        return FRIENDLY_409[error.code] || error.message || 'That conflicts with an existing record.';
      default:
        return error.message || 'The request failed. Please try again.';
    }
  }
  return error instanceof Error ? error.message : 'The request failed. Please try again.';
}

export default apiErrorMessage;
