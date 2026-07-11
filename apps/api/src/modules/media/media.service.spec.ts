import { MediaOwnerType, MediaRole, MediaType } from '@prisma/client';
import type { ConfigService } from '@nestjs/config';
import type { PrismaService } from '../../prisma/prisma.service';
import { MediaService } from './media.service';
import type { MediaInputDto } from './dto/media.dto';

function makeService(prisma: Record<string, unknown>): MediaService {
  const config = {
    getOrThrow: () => 'demo',
  } as unknown as ConfigService;
  return new MediaService(prisma as unknown as PrismaService, config);
}

interface ExistingAsset {
  publicId: string;
  posterId: string | null;
  type: MediaType;
}

/**
 * tx mock: the FIRST `mediaAsset.findMany` (existing-read) returns `existing`;
 * subsequent calls (the ref-safety check) return [] — nothing else references
 * the dropped ids, so the legacy enqueue expectations still hold.
 */
function makeTx(existing: ExistingAsset[] = []) {
  const findMany = jest
    .fn()
    .mockResolvedValue([])
    .mockResolvedValueOnce(existing);
  const deleteMany = jest.fn().mockResolvedValue({});
  const createMany = jest.fn().mockResolvedValue({});
  const garbageCreateMany = jest.fn().mockResolvedValue({});
  const tx = {
    mediaAsset: {
      findMany,
      deleteMany,
      createMany,
    },
    mediaGarbage: {
      createMany: garbageCreateMany,
      deleteMany: jest.fn().mockResolvedValue({}),
    },
  } as never;
  return { tx, findMany, deleteMany, createMany, garbageCreateMany };
}

describe('MediaService', () => {
  it('syncAssets replaces the set and falls back to array index for sortOrder', async () => {
    const { tx, deleteMany, createMany } = makeTx();
    const svc = makeService({});

    const assets: MediaInputDto[] = [
      { publicId: 'a', type: MediaType.IMAGE, role: MediaRole.hero },
      {
        publicId: 'b',
        type: MediaType.IMAGE,
        role: MediaRole.gallery,
        sortOrder: 5,
      },
    ];
    await svc.syncAssets(tx, MediaOwnerType.TOUR, 'tour-1', assets);

    expect(deleteMany).toHaveBeenCalledWith({
      where: { ownerType: MediaOwnerType.TOUR, ownerId: 'tour-1' },
    });
    const rows = createMany.mock.calls[0][0].data;
    expect(rows[0].sortOrder).toBe(0); // index fallback
    expect(rows[1].sortOrder).toBe(5); // explicit kept
  });

  it('syncAssets with an empty set only deletes (no createMany)', async () => {
    const { tx, deleteMany, createMany } = makeTx();
    await makeService({}).syncAssets(tx, MediaOwnerType.TOUR, 't', []);
    expect(deleteMany).toHaveBeenCalledTimes(1);
    expect(createMany).not.toHaveBeenCalled();
  });

  it('syncAssets records dropped (non-kept) assets as Cloudinary garbage', async () => {
    const { tx, garbageCreateMany } = makeTx([
      { publicId: 'old-hero', posterId: null, type: MediaType.IMAGE },
      { publicId: 'keep', posterId: null, type: MediaType.IMAGE },
    ]);
    await makeService({}).syncAssets(tx, MediaOwnerType.TOUR, 'tour-1', [
      { publicId: 'keep', type: MediaType.IMAGE, role: MediaRole.hero },
    ]);

    const rows = garbageCreateMany.mock.calls[0][0].data as Array<{
      publicId: string;
      resourceType: string;
    }>;
    expect(rows).toEqual([{ publicId: 'old-hero', resourceType: 'image' }]);
  });

  it('syncAssets records nothing when every asset is kept', async () => {
    const { tx, garbageCreateMany } = makeTx([
      { publicId: 'keep', posterId: null, type: MediaType.IMAGE },
    ]);
    await makeService({}).syncAssets(tx, MediaOwnerType.TOUR, 'tour-1', [
      { publicId: 'keep', type: MediaType.IMAGE, role: MediaRole.hero },
    ]);
    expect(garbageCreateMany).not.toHaveBeenCalled();
  });

  it('syncAssets with preserveRoles excludes those roles from read and delete', async () => {
    const { tx, findMany, deleteMany } = makeTx();
    await makeService({}).syncAssets(tx, MediaOwnerType.POST, 'p1', [], {
      preserveRoles: [MediaRole.body],
    });
    expect(findMany.mock.calls[0][0].where).toEqual({
      ownerType: MediaOwnerType.POST,
      ownerId: 'p1',
      role: { notIn: [MediaRole.body] },
    });
    expect(deleteMany.mock.calls[0][0].where).toEqual({
      ownerType: MediaOwnerType.POST,
      ownerId: 'p1',
      role: { notIn: [MediaRole.body] },
    });
  });

  it('syncAssets without opts keeps the legacy whole-owner where-clause', async () => {
    const { tx, findMany } = makeTx();
    await makeService({}).syncAssets(tx, MediaOwnerType.TOUR, 't1', []);
    expect(findMany.mock.calls[0][0].where).toEqual({
      ownerType: MediaOwnerType.TOUR,
      ownerId: 't1',
    });
  });

  it('attachToOwners builds URLs and groups media by owner (no N+1)', async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        ownerId: 't1',
        type: MediaType.IMAGE,
        publicId: 'p1',
        posterId: null,
        role: MediaRole.hero,
        width: 100,
        height: 50,
        durationSec: null,
        sortOrder: 0,
      },
    ]);
    const svc = makeService({ mediaAsset: { findMany } });

    const res = await svc.attachToOwners(MediaOwnerType.TOUR, [
      { id: 't1' },
      { id: 't2' },
    ]);

    expect(findMany).toHaveBeenCalledTimes(1);
    expect(res[0].media).toHaveLength(1);
    expect(res[0].media[0].publicId).toBe('p1');
    expect(res[0].media[0].url).toContain(
      'res.cloudinary.com/demo/image/upload/f_auto,q_auto/p1',
    );
    expect(res[1].media).toEqual([]); // owner with no media
  });

  it('attachToOwners returns [] for no owners (no query)', async () => {
    const findMany = jest.fn();
    const res = await makeService({ mediaAsset: { findMany } }).attachToOwners(
      MediaOwnerType.TOUR,
      [],
    );
    expect(res).toEqual([]);
    expect(findMany).not.toHaveBeenCalled();
  });

  it('deleteForOwner removes all assets and garbages publicId + video poster', async () => {
    const { tx, deleteMany, garbageCreateMany } = makeTx([
      { publicId: 'clip', posterId: 'clip-poster', type: MediaType.VIDEO },
    ]);
    await makeService({}).deleteForOwner(tx, MediaOwnerType.DESTINATION, 'd1');

    expect(deleteMany).toHaveBeenCalledWith({
      where: { ownerType: MediaOwnerType.DESTINATION, ownerId: 'd1' },
    });
    const rows = garbageCreateMany.mock.calls[0][0].data as Array<{
      publicId: string;
      resourceType: string;
    }>;
    expect(rows).toEqual([
      { publicId: 'clip', resourceType: 'video' },
      { publicId: 'clip-poster', resourceType: 'image' },
    ]);
  });

  it('registerAsset upserts a body row on the compound unique and returns its delivery url', async () => {
    const upsert = jest.fn().mockResolvedValue({});
    const svc = makeService({ mediaAsset: { upsert } });

    const res = await svc.registerAsset(
      MediaOwnerType.POST,
      'p1',
      MediaRole.body,
      {
        publicId: 'tourism/posts/body/1717000000000-boat',
      },
    );

    expect(upsert).toHaveBeenCalledWith({
      where: {
        ownerType_ownerId_publicId: {
          ownerType: MediaOwnerType.POST,
          ownerId: 'p1',
          publicId: 'tourism/posts/body/1717000000000-boat',
        },
      },
      update: {},
      create: {
        publicId: 'tourism/posts/body/1717000000000-boat',
        type: MediaType.IMAGE,
        ownerType: MediaOwnerType.POST,
        ownerId: 'p1',
        role: MediaRole.body,
        format: null,
        width: null,
        height: null,
        sortOrder: 0,
      },
    });
    expect(res.url).toContain('/image/upload/');
    expect(res.url).toContain('tourism/posts/body/1717000000000-boat');
  });

  it('registerAsset is idempotent: re-registering no-op-updates the existing row', async () => {
    const upsert = jest.fn().mockResolvedValue({ id: 'existing-row' });
    const svc = makeService({ mediaAsset: { upsert } });

    const res = await svc.registerAsset(
      MediaOwnerType.POST,
      'p1',
      MediaRole.body,
      {
        publicId: 'already-there',
      },
    );

    expect(upsert).toHaveBeenCalledTimes(1);
    expect(upsert.mock.calls[0][0].update).toEqual({});
    expect(res.url).toContain('already-there');
  });
});

describe('MediaService — GC ref-safety (wave D1)', () => {
  /** tx mock with SEQUENCED findMany: 1st = existing-read, 2nd = ref-check. */
  function makeRefTx(existing: ExistingAsset[], refs: unknown[]) {
    const findMany = jest
      .fn()
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce(refs);
    const deleteMany = jest.fn().mockResolvedValue({});
    const createMany = jest.fn().mockResolvedValue({});
    const garbageCreateMany = jest.fn().mockResolvedValue({});
    const tx = {
      mediaAsset: { findMany, deleteMany, createMany },
      mediaGarbage: {
        createMany: garbageCreateMany,
        deleteMany: jest.fn().mockResolvedValue({}),
      },
    } as never;
    return { tx, findMany, deleteMany, garbageCreateMany };
  }

  it('syncAssets does NOT enqueue a dropped publicId still referenced by another owner', async () => {
    const { tx, deleteMany, garbageCreateMany } = makeRefTx(
      [{ publicId: 'shared', posterId: null, type: MediaType.IMAGE }],
      [{ publicId: 'shared', posterId: null }], // another owner's surviving row
    );
    const svc = makeService({});

    await svc.syncAssets(tx, MediaOwnerType.TOUR, 't-1', []);

    expect(deleteMany).toHaveBeenCalled();
    expect(garbageCreateMany).not.toHaveBeenCalled();
  });

  it('syncAssets still enqueues a dropped publicId nobody references', async () => {
    const { tx, garbageCreateMany } = makeRefTx(
      [{ publicId: 'orphan', posterId: null, type: MediaType.IMAGE }],
      [], // no surviving references
    );
    const svc = makeService({});

    await svc.syncAssets(tx, MediaOwnerType.TOUR, 't-1', []);

    expect(garbageCreateMany).toHaveBeenCalledWith({
      data: [{ publicId: 'orphan', resourceType: 'image' }],
      skipDuplicates: true,
    });
  });

  it('the ref-check runs AFTER the owner rows are deleted (own rows never count)', async () => {
    const calls: string[] = [];
    const findMany = jest
      .fn()
      .mockImplementationOnce(() => {
        calls.push('read');
        return Promise.resolve([
          { publicId: 'x', posterId: null, type: MediaType.IMAGE },
        ]);
      })
      .mockImplementationOnce(() => {
        calls.push('refcheck');
        return Promise.resolve([]);
      });
    const deleteMany = jest.fn().mockImplementation(() => {
      calls.push('delete');
      return Promise.resolve({});
    });
    const tx = {
      mediaAsset: { findMany, deleteMany, createMany: jest.fn() },
      mediaGarbage: {
        createMany: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn().mockResolvedValue({}),
      },
    } as never;
    const svc = makeService({});

    await svc.syncAssets(tx, MediaOwnerType.TOUR, 't-1', []);

    expect(calls).toEqual(['read', 'delete', 'refcheck']);
  });

  it('checks poster references too (a shared poster is kept, the video goes)', async () => {
    const { tx, garbageCreateMany } = makeRefTx(
      [{ publicId: 'clip', posterId: 'poster-1', type: MediaType.VIDEO }],
      [{ publicId: 'other', posterId: 'poster-1' }], // someone still uses the poster
    );
    const svc = makeService({});

    await svc.deleteForOwner(tx, MediaOwnerType.TOUR, 't-1');

    expect(garbageCreateMany).toHaveBeenCalledWith({
      data: [{ publicId: 'clip', resourceType: 'video' }],
      skipDuplicates: true,
    });
  });
});

describe('MediaService — alt round-trip (wave D1)', () => {
  function makeAltTx(existing: Array<Record<string, unknown>>) {
    const findMany = jest
      .fn()
      .mockResolvedValue([])
      .mockResolvedValueOnce(existing);
    const createMany = jest.fn().mockResolvedValue({});
    const tx = {
      mediaAsset: {
        findMany,
        deleteMany: jest.fn().mockResolvedValue({}),
        createMany,
      },
      mediaGarbage: {
        createMany: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn().mockResolvedValue({}),
      },
    } as never;
    return { tx, createMany };
  }

  it('stores alt from the payload', async () => {
    const { tx, createMany } = makeAltTx([]);
    const svc = makeService({});

    await svc.syncAssets(tx, MediaOwnerType.TOUR, 't-1', [
      {
        publicId: 'a',
        type: MediaType.IMAGE,
        role: MediaRole.hero,
        alt: 'Lantern-lit old town at dusk',
      } as never,
    ]);

    expect(createMany.mock.calls[0][0].data[0].alt).toBe(
      'Lantern-lit old town at dusk',
    );
  });

  it('preserves the stored alt when a kept row is re-sent without one', async () => {
    const { tx, createMany } = makeAltTx([
      {
        publicId: 'a',
        posterId: null,
        type: MediaType.IMAGE,
        alt: 'Existing alt',
      },
    ]);
    const svc = makeService({});

    await svc.syncAssets(tx, MediaOwnerType.TOUR, 't-1', [
      { publicId: 'a', type: MediaType.IMAGE, role: MediaRole.hero } as never,
    ]);

    expect(createMany.mock.calls[0][0].data[0].alt).toBe('Existing alt');
  });

  it('clears alt with an explicit null', async () => {
    const { tx, createMany } = makeAltTx([
      {
        publicId: 'a',
        posterId: null,
        type: MediaType.IMAGE,
        alt: 'Old alt',
      },
    ]);
    const svc = makeService({});

    await svc.syncAssets(tx, MediaOwnerType.TOUR, 't-1', [
      {
        publicId: 'a',
        type: MediaType.IMAGE,
        role: MediaRole.hero,
        alt: null,
      } as never,
    ]);

    expect(createMany.mock.calls[0][0].data[0].alt).toBeNull();
  });
});

describe('MediaService — review fixes (wave D1)', () => {
  it('syncAssets 400s when a payload publicId survives under a preserved role (unique would 500)', async () => {
    // Post cover replace preserves body rows; picking the body image as the
    // cover would violate (ownerType, ownerId, publicId) on createMany.
    const findMany = jest
      .fn()
      // existing read (preserved roles excluded)
      .mockResolvedValueOnce([])
      // NEW: preserved-role conflict check
      .mockResolvedValueOnce([{ publicId: 'blog/foo' }]);
    const tx = {
      mediaAsset: {
        findMany,
        deleteMany: jest.fn().mockResolvedValue({}),
        createMany: jest.fn(),
      },
      mediaGarbage: {
        createMany: jest.fn(),
        deleteMany: jest.fn().mockResolvedValue({}),
      },
    } as never;
    const svc = makeService({});

    await expect(
      svc.syncAssets(
        tx,
        MediaOwnerType.POST,
        'p-1',
        [
          {
            publicId: 'blog/foo',
            type: MediaType.IMAGE,
            role: MediaRole.hero,
          } as never,
        ],
        { preserveRoles: [MediaRole.body] },
      ),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('syncAssets purges kept publicIds from the garbage queue (re-attach defuses a pending destroy)', async () => {
    const garbageDeleteMany = jest.fn().mockResolvedValue({});
    const findMany = jest.fn().mockResolvedValue([]);
    const tx = {
      mediaAsset: {
        findMany,
        deleteMany: jest.fn().mockResolvedValue({}),
        createMany: jest.fn().mockResolvedValue({}),
      },
      mediaGarbage: {
        createMany: jest.fn(),
        deleteMany: garbageDeleteMany,
      },
    } as never;
    const svc = makeService({});

    await svc.syncAssets(tx, MediaOwnerType.TOUR, 't-1', [
      {
        publicId: 'reused',
        type: MediaType.IMAGE,
        role: MediaRole.hero,
      } as never,
    ]);

    expect(garbageDeleteMany).toHaveBeenCalledWith({
      where: { publicId: { in: ['reused'] } },
    });
  });
});
