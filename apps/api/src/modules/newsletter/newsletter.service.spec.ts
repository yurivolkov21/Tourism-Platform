import { Logger } from '@nestjs/common';
import { NewsletterService } from './newsletter.service';

beforeAll(() => {
  jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
});
afterAll(() => {
  jest.restoreAllMocks();
});

function makePrisma(opts: {
  upsert?: jest.Mock;
  findMany?: jest.Mock;
  count?: jest.Mock;
}) {
  return {
    subscriber: {
      upsert: opts.upsert ?? jest.fn().mockResolvedValue({ id: 's-1' }),
      findMany: opts.findMany ?? jest.fn().mockResolvedValue([]),
      count: opts.count ?? jest.fn().mockResolvedValue(0),
    },
  };
}

describe('NewsletterService.subscribe', () => {
  it('upserts by normalized email (trim + lowercase) with a no-op update', async () => {
    const upsert = jest.fn().mockResolvedValue({ id: 's-1' });
    const svc = new NewsletterService(makePrisma({ upsert }) as never);

    await svc.subscribe({ email: '  Jane@Example.COM ', source: 'footer' });

    expect(upsert).toHaveBeenCalledWith({
      where: { email: 'jane@example.com' },
      update: {},
      create: { email: 'jane@example.com', source: 'footer' },
    });
  });

  it('resolves identically for a brand-new and an already-subscribed email (silent dedupe)', async () => {
    const upsert = jest.fn().mockResolvedValue({ id: 's-1' });
    const svc = new NewsletterService(makePrisma({ upsert }) as never);

    await expect(
      svc.subscribe({ email: 'new@x.com' }),
    ).resolves.toBeUndefined();
    await expect(
      svc.subscribe({ email: 'new@x.com' }),
    ).resolves.toBeUndefined();
    expect(upsert).toHaveBeenCalledTimes(2);
  });

  it('stores null source when omitted', async () => {
    const upsert = jest.fn().mockResolvedValue({ id: 's-1' });
    const svc = new NewsletterService(makePrisma({ upsert }) as never);

    await svc.subscribe({ email: 'a@b.com' });

    expect(upsert.mock.calls[0][0].create).toEqual({
      email: 'a@b.com',
      source: null,
    });
  });
});

describe('NewsletterService.findAllForAdmin', () => {
  it('lists newest-first with pagination and hoistable { items, meta }', async () => {
    const rows = [
      { id: 's-1', email: 'a@b.com', source: null, subscribedAt: new Date() },
    ];
    const findMany = jest.fn().mockResolvedValue(rows);
    const count = jest.fn().mockResolvedValue(41);
    const svc = new NewsletterService(makePrisma({ findMany, count }) as never);

    const out = await svc.findAllForAdmin({ page: 2, pageSize: 20 });

    expect(findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: { subscribedAt: 'desc' },
      skip: 20,
      take: 20,
    });
    expect(out.items).toEqual(rows);
    expect(out.meta).toEqual({
      page: 2,
      pageSize: 20,
      total: 41,
      totalPages: 3,
    });
  });

  it('filters by case-insensitive email contains on search', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const svc = new NewsletterService(makePrisma({ findMany }) as never);

    await svc.findAllForAdmin({ search: '  Jane ' });

    expect(findMany.mock.calls[0][0].where).toEqual({
      email: { contains: 'Jane', mode: 'insensitive' },
    });
  });
});
