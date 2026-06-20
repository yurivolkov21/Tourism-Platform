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

describe('MediaService', () => {
  it('syncAssets replaces the set and falls back to array index for sortOrder', async () => {
    const deleteMany = jest.fn().mockResolvedValue({});
    const createMany = jest.fn().mockResolvedValue({});
    const tx = { mediaAsset: { deleteMany, createMany } } as never;
    const svc = makeService({});

    const assets: MediaInputDto[] = [
      { publicId: 'a', type: MediaType.IMAGE, role: MediaRole.hero },
      { publicId: 'b', type: MediaType.IMAGE, role: MediaRole.gallery, sortOrder: 5 },
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
    const deleteMany = jest.fn().mockResolvedValue({});
    const createMany = jest.fn();
    const tx = { mediaAsset: { deleteMany, createMany } } as never;
    await makeService({}).syncAssets(tx, MediaOwnerType.TOUR, 't', []);
    expect(deleteMany).toHaveBeenCalledTimes(1);
    expect(createMany).not.toHaveBeenCalled();
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

  it('deleteForOwner removes all assets for the owner', async () => {
    const deleteMany = jest.fn().mockResolvedValue({});
    const tx = { mediaAsset: { deleteMany } } as never;
    await makeService({}).deleteForOwner(tx, MediaOwnerType.DESTINATION, 'd1');
    expect(deleteMany).toHaveBeenCalledWith({
      where: { ownerType: MediaOwnerType.DESTINATION, ownerId: 'd1' },
    });
  });
});
