import createClient, { type Client, type Middleware } from 'openapi-fetch';
import type { ApiError } from '../api-response.js';
import type { paths } from './schema.js';

/**
 * Thrown by the client on any non-2xx response, carrying our envelope's typed
 * `error` ({@link ApiError}: code + message) plus the HTTP status. Gives call
 * sites a single failure channel instead of inspecting `{ error }` on every call.
 */
export class ApiRequestError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(status: number, body: ApiError) {
    super(body.message);
    this.name = 'ApiRequestError';
    this.code = body.code;
    this.status = status;
  }
}

export interface CreateApiClientOptions {
  /** API origin (e.g. `https://api.example.com`). Routes already include `/api/v1`. */
  baseUrl: string;
  /**
   * Returns the current Supabase access token (or null/undefined when signed
   * out). Called per request, so a refreshed token is always used.
   */
  getToken?: () =>
    | string
    | null
    | undefined
    | Promise<string | null | undefined>;
  /** Override `fetch` (tests / non-browser runtimes). Defaults to global fetch. */
  fetch?: typeof globalThis.fetch;
}

export type ApiClient = Client<paths>;

/**
 * Build a typed API client for `@tourism/web` / `admin` / `mobile`.
 *
 * Two middlewares:
 *  - **auth** — attaches `Authorization: Bearer <token>` from `getToken()`.
 *  - **error** — on non-2xx, parses the envelope and throws `ApiError`.
 *
 * Success bodies pass through typed per the generated schema. NOTE: the API's
 * Swagger documents list responses with the `{ data, meta }` envelope but single
 * resources as the bare type, so response-body typing is not yet uniform — read
 * `.data` per endpoint or use {@link unwrap}. Making Swagger uniformly
 * envelope-aware is a deferred follow-up (P1.8 spec §out-of-scope).
 */
export function createApiClient(options: CreateApiClientOptions): ApiClient {
  const client = createClient<paths>({
    baseUrl: options.baseUrl,
    fetch: options.fetch,
  });

  const middleware: Middleware = {
    async onRequest({ request }) {
      const token = options.getToken ? await options.getToken() : undefined;
      if (token) request.headers.set('Authorization', `Bearer ${token}`);
      return request;
    },
    async onResponse({ response }) {
      if (!response.ok) {
        let parsed: unknown;
        try {
          parsed = await response.clone().json();
        } catch {
          parsed = undefined;
        }
        const error = (parsed as { error?: ApiError } | undefined)?.error;
        throw new ApiRequestError(
          response.status,
          error ?? { code: 'UNKNOWN', message: response.statusText },
        );
      }
      return response;
    },
  };

  client.use(middleware);
  return client;
}

/**
 * Reads `data` out of our response envelope, throwing {@link ApiRequestError}
 * when the envelope carries an `error`. Useful at call sites holding a raw envelope.
 */
export function unwrap<T>(envelope: {
  data: T | null;
  error: ApiError | null;
}): T {
  if (envelope.error) {
    throw new ApiRequestError(0, envelope.error);
  }
  return envelope.data as T;
}
