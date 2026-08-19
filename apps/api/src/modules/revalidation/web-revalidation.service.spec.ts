import { Logger } from '@nestjs/common';
import { WebRevalidationService } from './web-revalidation.service';

beforeAll(() => {
  jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
});
afterAll(() => {
  jest.restoreAllMocks();
});

function makeConfig(values: Record<string, string | undefined>) {
  return {
    getOrThrow: (k: string) => {
      const v = values[k];
      if (v == null) throw new Error(`missing ${k}`);
      return v;
    },
    get: (k: string) => values[k],
  } as never;
}

const CONFIGURED = {
  'app.frontendUrl': 'https://nexora.example.com',
  'revalidate.secret': 's3cr3t-value',
};

describe('WebRevalidationService', () => {
  const realFetch = global.fetch;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as never;
  });
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('no-ops (no fetch) when the secret is unset', async () => {
    const svc = new WebRevalidationService(
      makeConfig({ 'app.frontendUrl': 'https://nexora.example.com' }),
    );
    await svc.revalidateTour('ha-long');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('POSTs to the web revalidate route with the secret header + tags body', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    const svc = new WebRevalidationService(makeConfig(CONFIGURED));

    await svc.revalidateTags(['tours', 'trust-stats']);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://nexora.example.com/api/revalidate');
    expect(init.method).toBe('POST');
    expect(
      (init.headers as Record<string, string>)['x-revalidate-secret'],
    ).toBe('s3cr3t-value');
    expect(JSON.parse(init.body as string)).toEqual({
      tags: ['tours', 'trust-stats'],
    });
  });

  it('revalidateTour is a thin wrapper mapping the slug to its tag', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    const svc = new WebRevalidationService(makeConfig(CONFIGURED));

    await svc.revalidateTour('ha-long');

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({
      tags: ['tour:ha-long'],
    });
  });

  it('no-ops on an empty tag list (nothing to bust)', async () => {
    const svc = new WebRevalidationService(makeConfig(CONFIGURED));
    await svc.revalidateTags([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('strips a trailing slash from FRONTEND_URL', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    const svc = new WebRevalidationService(
      makeConfig({
        'app.frontendUrl': 'https://nexora.example.com/',
        'revalidate.secret': 's3cr3t-value',
      }),
    );
    await svc.revalidateTour('ha-long');
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://nexora.example.com/api/revalidate',
    );
  });

  it('swallows a non-2xx response (resolves, never throws)', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });
    const svc = new WebRevalidationService(makeConfig(CONFIGURED));
    await expect(svc.revalidateTour('ha-long')).resolves.toBeUndefined();
  });

  it('swallows a transport error (resolves, never throws)', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));
    const svc = new WebRevalidationService(makeConfig(CONFIGURED));
    await expect(svc.revalidateTour('ha-long')).resolves.toBeUndefined();
  });
});
