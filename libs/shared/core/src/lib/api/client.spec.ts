import { ApiRequestError, createApiClient, unwrap } from './client.js';

/** Build a JSON Response with our envelope shape. */
function envelope(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Capture the Request openapi-fetch hands to fetch. */
function captureFetch(response: Response): {
  fetch: typeof globalThis.fetch;
  last: () => Request | undefined;
} {
  let seen: Request | undefined;
  const fetch: typeof globalThis.fetch = async (input, init) => {
    seen = input instanceof Request ? input : new Request(input, init);
    return response;
  };
  return { fetch, last: () => seen };
}

describe('createApiClient — auth middleware', () => {
  it('attaches Authorization: Bearer when getToken returns a token', async () => {
    const cap = captureFetch(envelope({ data: [], error: null, meta: {} }));
    const client = createApiClient({
      baseUrl: 'http://api.test',
      getToken: () => 'tok-123',
      fetch: cap.fetch,
    });

    await client.GET('/api/v1/destinations');

    expect(cap.last()?.headers.get('authorization')).toBe('Bearer tok-123');
  });

  it('omits Authorization when getToken returns null', async () => {
    const cap = captureFetch(envelope({ data: [], error: null, meta: {} }));
    const client = createApiClient({
      baseUrl: 'http://api.test',
      getToken: () => null,
      fetch: cap.fetch,
    });

    await client.GET('/api/v1/destinations');

    expect(cap.last()?.headers.get('authorization')).toBeNull();
  });

  it('awaits an async getToken', async () => {
    const cap = captureFetch(envelope({ data: [], error: null, meta: {} }));
    const client = createApiClient({
      baseUrl: 'http://api.test',
      getToken: () => Promise.resolve('async-tok'),
      fetch: cap.fetch,
    });

    await client.GET('/api/v1/destinations');

    expect(cap.last()?.headers.get('authorization')).toBe('Bearer async-tok');
  });
});

describe('createApiClient — error middleware', () => {
  it('throws ApiRequestError carrying the envelope code + status on non-2xx', async () => {
    const cap = captureFetch(
      envelope(
        { data: null, error: { code: 'TOUR_NOT_FOUND', message: 'nope' } },
        404,
      ),
    );
    const client = createApiClient({
      baseUrl: 'http://api.test',
      fetch: cap.fetch,
    });

    await expect(client.GET('/api/v1/destinations')).rejects.toMatchObject({
      name: 'ApiRequestError',
      code: 'TOUR_NOT_FOUND',
      status: 404,
    });
  });

  it('falls back to UNKNOWN when the error body is unparseable', async () => {
    const bad = new Response('<<not json>>', { status: 500 });
    const client = createApiClient({
      baseUrl: 'http://api.test',
      fetch: async () => bad,
    });

    await expect(client.GET('/api/v1/destinations')).rejects.toMatchObject({
      code: 'UNKNOWN',
      status: 500,
    });
  });
});

describe('unwrap', () => {
  it('returns data on a success envelope', () => {
    expect(unwrap({ data: { id: '1' }, error: null })).toEqual({ id: '1' });
  });

  it('throws ApiRequestError on an error envelope', () => {
    expect(() =>
      unwrap({ data: null, error: { code: 'X', message: 'y' } }),
    ).toThrow(ApiRequestError);
  });
});
