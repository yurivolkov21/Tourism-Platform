/**
 * Standard API envelope shared by the backend and every frontend client.
 *
 * Lives in `@tourism/core` (platform-agnostic) so web/admin/mobile can type
 * responses against the exact shape the API emits. The API wraps success
 * responses via `TransformInterceptor` and failures via `HttpExceptionFilter`.
 */

/**
 * Structured error payload. Frontends switch on `code` (stable, machine-readable
 * — never rename without coordinating with the FE). `message` is English-only
 * (ADR-0005). `details` is `unknown` so callers narrow before reading.
 */
export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * Pagination + arbitrary metadata for list responses. Well-known fields are
 * typed; the index signature lets specific endpoints add their own meta.
 */
export interface ApiMeta {
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
  [key: string]: unknown;
}

/**
 * Envelope wrapping every success AND failure response. `data` and `error` are
 * mutually exclusive (`data: null` ↔ `error: ApiError`).
 *
 * @template T Type of the `data` payload on success.
 */
export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
  meta?: ApiMeta;
}
