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
        return error.message || 'That conflicts with an existing record.';
      default:
        return error.message || 'The request failed. Please try again.';
    }
  }
  return error instanceof Error ? error.message : 'The request failed. Please try again.';
}

export default apiErrorMessage;
