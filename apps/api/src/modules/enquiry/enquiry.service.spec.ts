import { Logger, NotFoundException } from '@nestjs/common';
import { EnquiryStatus } from '@prisma/client';
import { EnquiryService } from './enquiry.service';

beforeAll(() => {
  jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
});
afterAll(() => {
  jest.restoreAllMocks();
});

const baseDto = {
  name: 'Jane Traveller',
  email: 'jane@example.com',
  message: 'Is the Hoi An tour available in July?',
};

function makePrisma(opts: {
  tourFindFirst?: jest.Mock;
  create?: jest.Mock;
  outboxCreate?: jest.Mock;
  findMany?: jest.Mock;
  count?: jest.Mock;
  findUnique?: jest.Mock;
  update?: jest.Mock;
}) {
  const enquiry = {
    create: opts.create ?? jest.fn().mockResolvedValue({ id: 'e-1' }),
    findMany: opts.findMany ?? jest.fn().mockResolvedValue([]),
    count: opts.count ?? jest.fn().mockResolvedValue(0),
    findUnique: opts.findUnique ?? jest.fn(),
    update: opts.update ?? jest.fn(),
  };
  const outbox = {
    create: opts.outboxCreate ?? jest.fn().mockResolvedValue({}),
  };
  return {
    tour: { findFirst: opts.tourFindFirst ?? jest.fn() },
    enquiry,
    outbox,
    // Interactive tx — run the callback against the same mock (ADR-0007 enqueue).
    $transaction: jest.fn(
      (
        cb: (tx: { enquiry: typeof enquiry; outbox: typeof outbox }) => unknown,
      ) => cb({ enquiry, outbox }),
    ),
  };
}

describe('EnquiryService.create', () => {
  it('creates a general enquiry (no tourId) and enqueues an ack email', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'e-1' });
    const outboxCreate = jest.fn().mockResolvedValue({});
    const svc = new EnquiryService(
      makePrisma({ create, outboxCreate }) as never,
    );

    await svc.create(baseDto);

    type CreateCall = { data: { tourId: string | null; name: string } };
    const calls = create.mock.calls as unknown as CreateCall[][];
    expect(calls[0][0].data.tourId).toBeNull();
    expect(calls[0][0].data.name).toBe('Jane Traveller');

    type OutboxCall = { data: { type: string; dedupeKey: string } };
    const outboxCalls = outboxCreate.mock.calls as unknown as OutboxCall[][];
    expect(outboxCalls[0][0].data.type).toBe('ENQUIRY_RECEIVED');
    expect(outboxCalls[0][0].data.dedupeKey).toBe('enquiry-received:e-1');
  });

  it('persists the structured lead fields (travelDate → Date, interests array)', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'e-1' });
    const svc = new EnquiryService(makePrisma({ create }) as never);

    await svc.create({
      ...baseDto,
      nationality: 'United Kingdom',
      travelDate: '2026-08-01',
      groupSize: 4,
      budgetTier: '$1000–$2000',
      interests: ['culture', 'food'],
    });

    type CreateCall = {
      data: {
        nationality: string | null;
        travelDate: Date | null;
        groupSize: number | null;
        budgetTier: string | null;
        interests: string[];
      };
    };
    const calls = create.mock.calls as unknown as CreateCall[][];
    expect(calls[0][0].data.nationality).toBe('United Kingdom');
    expect(calls[0][0].data.travelDate).toBeInstanceOf(Date);
    expect(calls[0][0].data.groupSize).toBe(4);
    expect(calls[0][0].data.budgetTier).toBe('$1000–$2000');
    expect(calls[0][0].data.interests).toEqual(['culture', 'food']);
  });

  it('defaults lead fields to null / [] when omitted', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'e-1' });
    const svc = new EnquiryService(makePrisma({ create }) as never);

    await svc.create(baseDto);

    type CreateCall = {
      data: {
        nationality: string | null;
        travelDate: Date | null;
        interests: string[];
      };
    };
    const calls = create.mock.calls as unknown as CreateCall[][];
    expect(calls[0][0].data.nationality).toBeNull();
    expect(calls[0][0].data.travelDate).toBeNull();
    expect(calls[0][0].data.interests).toEqual([]);
  });

  it('accepts a tourId that resolves to a published tour', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'e-1' });
    const svc = new EnquiryService(
      makePrisma({
        tourFindFirst: jest.fn().mockResolvedValue({ id: 't-1' }),
        create,
      }) as never,
    );

    await svc.create({ ...baseDto, tourId: 't-1' });

    type CreateCall = { data: { tourId: string | null } };
    const calls = create.mock.calls as unknown as CreateCall[][];
    expect(calls[0][0].data.tourId).toBe('t-1');
  });

  it('throws TOUR_NOT_FOUND when tourId is unknown or unpublished', async () => {
    const create = jest.fn();
    const svc = new EnquiryService(
      makePrisma({
        tourFindFirst: jest.fn().mockResolvedValue(null),
        create,
      }) as never,
    );

    await expect(
      svc.create({ ...baseDto, tourId: 't-missing' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(create).not.toHaveBeenCalled();
  });
});

describe('EnquiryService.findAllForAdmin', () => {
  it('paginates and maps rows', async () => {
    const findMany = jest
      .fn()
      .mockResolvedValue([{ id: 'e-1', status: EnquiryStatus.NEW }]);
    const count = jest.fn().mockResolvedValue(1);
    const svc = new EnquiryService(makePrisma({ findMany, count }) as never);

    const result = await svc.findAllForAdmin({});

    expect(result.items).toHaveLength(1);
    expect(result.meta.total).toBe(1);
    expect(result.meta.totalPages).toBe(1);
    type WhereCall = { where: Record<string, unknown> };
    const calls = findMany.mock.calls as unknown as WhereCall[][];
    expect('status' in calls[0][0].where).toBe(false);
  });

  it('applies the status filter when provided', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const svc = new EnquiryService(
      makePrisma({ findMany, count: jest.fn().mockResolvedValue(0) }) as never,
    );

    await svc.findAllForAdmin({ status: EnquiryStatus.WON });

    type WhereCall = { where: { status?: EnquiryStatus } };
    const calls = findMany.mock.calls as unknown as WhereCall[][];
    expect(calls[0][0].where.status).toBe(EnquiryStatus.WON);
  });

  it('findAllForAdmin joins the tour and maps qualification fields through', async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        id: 'e-1',
        name: 'Jane',
        email: 'jane@example.com',
        phone: null,
        message: 'Sapa trek?',
        tourId: 't-1',
        nationality: 'United Kingdom',
        travelDate: new Date('2026-08-01'),
        groupSize: 4,
        budgetTier: '$1000–$2000',
        interests: ['culture'],
        status: EnquiryStatus.NEW,
        createdAt: new Date(),
        updatedAt: new Date(),
        tour: { slug: 'sapa-trek', title: 'Sapa Trek 3D2N' },
      },
    ]);
    const count = jest.fn().mockResolvedValue(1);
    const svc = new EnquiryService(makePrisma({ findMany, count }) as never);

    const res = await svc.findAllForAdmin({});

    expect(findMany.mock.calls[0][0].include).toEqual({
      tour: { select: { slug: true, title: true } },
    });
    const item = res.items[0];
    expect(item.tourSlug).toBe('sapa-trek');
    expect(item.tourTitle).toBe('Sapa Trek 3D2N');
    expect(item.nationality).toBe('United Kingdom');
    expect((item as unknown as { tour?: unknown }).tour).toBeUndefined();
  });

  it('findAllForAdmin builds a case-insensitive OR search across name/email/phone/message', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const svc = new EnquiryService(makePrisma({ findMany, count }) as never);

    await svc.findAllForAdmin({ status: EnquiryStatus.NEW, search: ' sapa ' });

    const where = findMany.mock.calls[0][0].where;
    expect(where.status).toBe(EnquiryStatus.NEW);
    expect(where.OR).toEqual([
      { name: { contains: 'sapa', mode: 'insensitive' } },
      { email: { contains: 'sapa', mode: 'insensitive' } },
      { phone: { contains: 'sapa', mode: 'insensitive' } },
      { message: { contains: 'sapa', mode: 'insensitive' } },
    ]);
  });
});

describe('EnquiryService.updateStatus', () => {
  it('throws ENQUIRY_NOT_FOUND when id missing', async () => {
    const update = jest.fn();
    const svc = new EnquiryService(
      makePrisma({
        findUnique: jest.fn().mockResolvedValue(null),
        update,
      }) as never,
    );
    await expect(
      svc.updateStatus('missing', EnquiryStatus.CONTACTED),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(update).not.toHaveBeenCalled();
  });

  it('updates the status of an existing enquiry', async () => {
    const update = jest
      .fn()
      .mockResolvedValue({ id: 'e-1', status: EnquiryStatus.QUOTED });
    const svc = new EnquiryService(
      makePrisma({
        findUnique: jest.fn().mockResolvedValue({ id: 'e-1' }),
        update,
      }) as never,
    );

    await svc.updateStatus('e-1', EnquiryStatus.QUOTED);

    type UpdCall = { where: { id: string }; data: { status: EnquiryStatus } };
    const calls = update.mock.calls as unknown as UpdCall[][];
    expect(calls[0][0].where.id).toBe('e-1');
    expect(calls[0][0].data.status).toBe(EnquiryStatus.QUOTED);
  });
});
