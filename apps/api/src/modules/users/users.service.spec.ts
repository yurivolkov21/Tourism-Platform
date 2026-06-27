import { ConflictException, Logger, NotFoundException } from '@nestjs/common';
import { MediaOwnerType, MediaRole, MediaType } from '@prisma/client';
import { UsersService } from './users.service';

beforeAll(() => {
  jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
});
afterAll(() => {
  jest.restoreAllMocks();
});

const user = { id: 'u-1', email: 'a@b.com', fullName: 'A' };

function makePrisma(opts: {
  findUnique?: jest.Mock;
  update?: jest.Mock;
  transaction?: jest.Mock;
}) {
  return {
    user: {
      findUnique: opts.findUnique ?? jest.fn().mockResolvedValue(user),
      update: opts.update ?? jest.fn().mockResolvedValue(user),
    },
    // syncAssets is invoked with the tx; a passthrough callback is enough here.
    $transaction:
      opts.transaction ?? jest.fn((cb: (tx: unknown) => unknown) => cb({})),
  };
}

/** MediaService stub — `attachToOwner` returns the avatar url we configure. */
function makeMedia(avatarUrl: string | null) {
  return {
    syncAssets: jest.fn().mockResolvedValue(undefined),
    attachToOwner: jest.fn((_t: unknown, owner: Record<string, unknown>) =>
      Promise.resolve({
        ...owner,
        media: avatarUrl ? [{ url: avatarUrl, role: MediaRole.avatar }] : [],
      }),
    ),
  };
}

function makeConfig(overrides: Record<string, string> = {}) {
  const values: Record<string, string> = {
    'supabase.url': 'https://ref.supabase.co',
    'supabase.serviceRoleKey': 'service-role',
    ...overrides,
  };
  return { getOrThrow: jest.fn((k: string) => values[k]) };
}

describe('UsersService.getMe', () => {
  it('attaches avatarUrl from the USER media owner', async () => {
    const media = makeMedia('https://cdn/avatar.jpg');
    const svc = new UsersService(makePrisma({}) as never, media as never, makeConfig() as never);

    const result = await svc.getMe('u-1');

    expect(result.avatarUrl).toBe('https://cdn/avatar.jpg');
    expect(media.attachToOwner).toHaveBeenCalledWith(
      MediaOwnerType.USER,
      expect.objectContaining({ id: 'u-1' }),
    );
  });

  it('returns avatarUrl null when no avatar asset exists', async () => {
    const svc = new UsersService(
      makePrisma({}) as never,
      makeMedia(null) as never,
      makeConfig() as never,
    );
    const result = await svc.getMe('u-1');
    expect(result.avatarUrl).toBeNull();
  });

  it('throws USER_NOT_FOUND when the row is gone', async () => {
    const svc = new UsersService(
      makePrisma({ findUnique: jest.fn().mockResolvedValue(null) }) as never,
      makeMedia(null) as never,
      makeConfig() as never,
    );
    await expect(svc.getMe('missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('UsersService.setAvatar', () => {
  it('syncs a single IMAGE/avatar asset (replace-all) and returns the url', async () => {
    const media = makeMedia('https://cdn/new.jpg');
    const svc = new UsersService(makePrisma({}) as never, media as never, makeConfig() as never);

    const result = await svc.setAvatar('u-1', { publicId: 'tourism/users/avatar/x' });

    expect(result.avatarUrl).toBe('https://cdn/new.jpg');
    type SyncCall = [unknown, MediaOwnerType, string, Array<{ type: MediaType; role: MediaRole }>];
    const calls = media.syncAssets.mock.calls as unknown as SyncCall[];
    expect(calls[0][1]).toBe(MediaOwnerType.USER);
    expect(calls[0][2]).toBe('u-1');
    expect(calls[0][3]).toHaveLength(1);
    expect(calls[0][3][0].type).toBe(MediaType.IMAGE);
    expect(calls[0][3][0].role).toBe(MediaRole.avatar);
  });

  it('throws USER_NOT_FOUND before syncing when the user is missing', async () => {
    const media = makeMedia(null);
    const svc = new UsersService(
      makePrisma({ findUnique: jest.fn().mockResolvedValue(null) }) as never,
      media as never,
      makeConfig() as never,
    );
    await expect(
      svc.setAvatar('missing', { publicId: 'x' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(media.syncAssets).not.toHaveBeenCalled();
  });
});

describe('UsersService.deleteMe', () => {
  const caller = { id: 'u-1', supabaseId: 'sub-1' };

  it('refuses (409) when the user still has bookings', async () => {
    const prisma = {
      booking: { count: jest.fn().mockResolvedValue(2) },
      user: { delete: jest.fn() },
    };
    const svc = new UsersService(prisma as never, makeMedia(null) as never, makeConfig() as never);
    await expect(svc.deleteMe(caller)).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.user.delete).not.toHaveBeenCalled();
  });

  it('deletes the local row + the Supabase auth user when there are no bookings', async () => {
    const prisma = {
      booking: { count: jest.fn().mockResolvedValue(0) },
      user: { delete: jest.fn().mockResolvedValue({}) },
    };
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ ok: true } as Response);
    const svc = new UsersService(prisma as never, makeMedia(null) as never, makeConfig() as never);

    await svc.deleteMe(caller);

    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'u-1' } });
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://ref.supabase.co/auth/v1/admin/users/sub-1',
      expect.objectContaining({ method: 'DELETE' }),
    );
    fetchSpy.mockRestore();
  });
});

describe('UsersService.clearAvatar', () => {
  it('syncs the empty set and returns avatarUrl null', async () => {
    const media = makeMedia(null);
    const svc = new UsersService(makePrisma({}) as never, media as never, makeConfig() as never);

    const result = await svc.clearAvatar('u-1');

    expect(result.avatarUrl).toBeNull();
    type SyncCall = [unknown, MediaOwnerType, string, unknown[]];
    const calls = media.syncAssets.mock.calls as unknown as SyncCall[];
    expect(calls[0][3]).toEqual([]);
  });
});
