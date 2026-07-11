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
  TOUR_IS_PUBLISHED:
    'This tour is still published. Unpublish it first, then you can delete it.',
  TOUR_HAS_BOOKINGS: 'This tour has bookings, so it can’t be deleted.',
  DEPARTURE_HAS_BOOKINGS:
    'This departure has bookings, so it can’t be deleted.',
  OUTBOX_ROW_SENT:
    'This email has already been sent, so it can’t be deleted — it stays as delivery history.',
  DESTINATION_SLUG_EXISTS:
    'That URL slug is already used by another destination. Please choose a different one.',
  CATEGORY_SLUG_EXISTS:
    'That URL slug is already used by another category. Please choose a different one.',
  TOUR_SLUG_EXISTS:
    'That URL slug is already used by another tour. Please choose a different one.',
  POST_SLUG_EXISTS:
    'That URL slug is already used by another post. Please choose a different one.',
};

/**
 * Plain-language messages keyed by API `code`, regardless of HTTP status (e.g. booking refund
 * 400s). Checked before the status switch so these win over the generic per-status fallback.
 */
const FRIENDLY_BY_CODE: Record<string, string> = {
  BOOKING_NOT_REFUNDABLE:
    'Only a paid booking can be refunded. This one isn’t in the “Paid” state, so there’s nothing to refund.',
  REFUND_FAILED:
    'The refund couldn’t be completed with the payment provider. Please try again in a moment, or check the Stripe dashboard.',
  DEPARTURE_IN_PAST:
    'The start date can’t be in the past. Pick today or a later date — past departures can’t be booked.',
  INVALID_DATE_RANGE: 'The end date must be on or after the start date.',
  SEATS_TOTAL_BELOW_BOOKED:
    'You can’t set total seats below the number already booked. Increase the total, or cancel some bookings first.',
  REVIEW_NOT_CURATED:
    'Only curated testimonials can be deleted. To hide a verified traveller review, unapprove it instead.',
  ROLE_SELF_CHANGE: 'You cannot change your own role.',
  ROLE_ENV_ADMIN:
    'This admin is on the ADMIN_EMAILS bootstrap list — edit the env to change it.',
  ROLE_LAST_ADMIN: 'Cannot demote the last remaining admin.',
  USER_SELF_DELETE:
    'You cannot delete your own account from the admin console.',
  USER_IS_ADMIN: 'Demote this admin to customer before deleting the account.',
  USER_HAS_POSTS:
    'This user authored blog posts — reassign or delete those posts first.',
  ACCOUNT_HAS_BOOKINGS:
    'This account has bookings on record and cannot be deleted.',
  INVALID_REFUND_AMOUNT: 'That refund amount is not valid for this booking.',
  CANCELLATION_REQUEST_NOT_FOUND: 'That cancellation request no longer exists.',
  CANCELLATION_NOT_PENDING: 'This request has already been resolved.',
};

/**
 * Maps an API failure to a short, friendly English message. For 409 conflicts it prefers a
 * plain-language message keyed by the API `code` (the raw backend messages are developer-flavoured).
 */
export function apiErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    if (FRIENDLY_BY_CODE[error.code]) return FRIENDLY_BY_CODE[error.code];
    switch (error.status) {
      case 401:
        return 'Your session has expired. Please sign in again.';
      case 403:
        return 'Your account is not authorized for the admin console.';
      case 404:
        return 'That record no longer exists.';
      case 409:
        return (
          FRIENDLY_409[error.code] ||
          error.message ||
          'That conflicts with an existing record.'
        );
      default:
        return error.message || 'The request failed. Please try again.';
    }
  }
  return error instanceof Error
    ? error.message
    : 'The request failed. Please try again.';
}

export default apiErrorMessage;
