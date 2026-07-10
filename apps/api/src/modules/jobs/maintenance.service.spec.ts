import { Logger } from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { MaintenanceService } from './maintenance.service';

beforeAll(() => {
  jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
});
afterAll(() => {
  jest.restoreAllMocks();
});

function makeCloudinary(destroy?: jest.Mock) {
  return { destroy: destroy ?? jest.fn().mockResolvedValue('ok') };
}

describe('MaintenanceService.cancelAbandonedBookings', () => {
  it('cancels stale PENDING bookings and returns the count', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 3 });
    const prisma = { booking: { updateMany } };
    const svc = new MaintenanceService(
      prisma as never,
      makeCloudinary() as never,
    );

    const count = await svc.cancelAbandonedBookings(30);

    expect(count).toBe(3);
    type Call = {
      where: { status: BookingStatus; createdAt: { lt: Date } };
      data: { status: BookingStatus };
    };
    const calls = updateMany.mock.calls as unknown as Call[][];
    expect(calls[0][0].where.status).toBe(BookingStatus.PENDING);
    expect(calls[0][0].where.createdAt.lt).toBeInstanceOf(Date);
    expect(calls[0][0].data.status).toBe(BookingStatus.CANCELLED);
  });

  it('applies the TTL to the cutoff (older TTL → earlier cutoff)', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 0 });
    const svc = new MaintenanceService(
      { booking: { updateMany } } as never,
      makeCloudinary() as never,
    );

    await svc.cancelAbandonedBookings(60);

    type Call = { where: { createdAt: { lt: Date } } };
    const calls = updateMany.mock.calls as unknown as Call[][];
    const cutoff = calls[0][0].where.createdAt.lt.getTime();
    // 60-minute cutoff is ~60 min before now.
    expect(Date.now() - cutoff).toBeGreaterThanOrEqual(59 * 60_000);
  });
});

describe('MaintenanceService.reconcileMedia', () => {
  const garbage = [
    {
      id: 'g-1',
      publicId: 'tourism/old-hero',
      resourceType: 'image',
      attempts: 0,
    },
    { id: 'g-2', publicId: 'tourism/clip', resourceType: 'video', attempts: 0 },
  ];

  it('destroys each orphan and deletes its row on success', async () => {
    const destroy = jest.fn().mockResolvedValue('ok');
    const del = jest.fn().mockResolvedValue({});
    const update = jest.fn();
    const prisma = {
      mediaGarbage: {
        findMany: jest.fn().mockResolvedValue(garbage),
        delete: del,
        update,
      },
    };
    const svc = new MaintenanceService(
      prisma as never,
      makeCloudinary(destroy) as never,
    );

    const result = await svc.reconcileMedia();

    expect(result).toEqual({ destroyed: 2, failed: 0 });
    expect(destroy).toHaveBeenCalledWith('tourism/old-hero', 'image');
    expect(destroy).toHaveBeenCalledWith('tourism/clip', 'video');
    expect(del).toHaveBeenCalledTimes(2);
    expect(update).not.toHaveBeenCalled();
  });

  it('keeps a row and bumps attempts when destroy throws', async () => {
    const destroy = jest
      .fn()
      .mockResolvedValueOnce('ok')
      .mockRejectedValueOnce(new Error('cloudinary 500'));
    const del = jest.fn().mockResolvedValue({});
    const update = jest.fn().mockResolvedValue({});
    const prisma = {
      mediaGarbage: {
        findMany: jest.fn().mockResolvedValue(garbage),
        delete: del,
        update,
      },
    };
    const svc = new MaintenanceService(
      prisma as never,
      makeCloudinary(destroy) as never,
    );

    const result = await svc.reconcileMedia();

    expect(result).toEqual({ destroyed: 1, failed: 1 });
    expect(del).toHaveBeenCalledTimes(1);
    type UpdCall = {
      where: { id: string };
      data: { attempts: number; lastError: string };
    };
    const calls = update.mock.calls as unknown as UpdCall[][];
    expect(calls[0][0].where.id).toBe('g-2');
    expect(calls[0][0].data.attempts).toBe(1);
    expect(calls[0][0].data.lastError).toContain('cloudinary 500');
  });

  it('is a no-op when there is no garbage', async () => {
    const destroy = jest.fn();
    const prisma = {
      mediaGarbage: {
        findMany: jest.fn().mockResolvedValue([]),
        delete: jest.fn(),
        update: jest.fn(),
      },
    };
    const svc = new MaintenanceService(
      prisma as never,
      makeCloudinary(destroy) as never,
    );

    const result = await svc.reconcileMedia();

    expect(result).toEqual({ destroyed: 0, failed: 0 });
    expect(destroy).not.toHaveBeenCalled();
  });
});
