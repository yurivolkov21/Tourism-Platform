import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { MediaOwnerType, MediaRole, MediaType } from '@prisma/client';

import { SiteMediaService } from './site-media.service';

beforeAll(() => {
  jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
});
afterAll(() => {
  jest.restoreAllMocks();
});

const HERO_SLOT = { id: 'slot-hero-uuid', key: 'home-hero' };
const STORY_SLOT = { id: 'slot-story-uuid', key: 'about-story' };

const heroInput = {
  publicId: 'tourism/site/hero',
  type: MediaType.IMAGE,
  role: MediaRole.hero,
};
const galleryInput = (n: number) => ({
  publicId: `tourism/site/story-${n}`,
  type: MediaType.IMAGE,
  role: MediaRole.gallery,
});

/** MediaService stub — attach passes through with the given media; writes no-op. */
function makeMedia(mediaByOwner: Record<string, unknown[]> = {}) {
  return {
    syncAssets: jest.fn().mockResolvedValue(undefined),
    attachToOwner: jest
      .fn()
      .mockImplementation((_t: unknown, owner: { id: string }) =>
        Promise.resolve({ ...owner, media: mediaByOwner[owner.id] ?? [] }),
      ),
    attachToOwners: jest
      .fn()
      .mockImplementation((_t: unknown, owners: { id: string }[]) =>
        Promise.resolve(
          owners.map((o) => ({ ...o, media: mediaByOwner[o.id] ?? [] })),
        ),
      ),
  } as unknown as import('../media/media.service').MediaService;
}

function makePrisma(slots: Array<{ id: string; key: string }>) {
  return {
    siteMediaSlot: {
      findMany: jest.fn().mockResolvedValue(slots),
      findUnique: jest
        .fn()
        .mockImplementation(({ where }: { where: { key: string } }) =>
          Promise.resolve(slots.find((s) => s.key === where.key) ?? null),
        ),
    },
    $transaction: jest
      .fn()
      .mockImplementation((fn: (tx: unknown) => unknown) => fn('tx')),
  };
}

function makeService(
  slots = [HERO_SLOT, STORY_SLOT],
  mediaByOwner: Record<string, unknown[]> = {},
  revalidator?: { revalidateTags: jest.Mock },
) {
  const prisma = makePrisma(slots);
  const media = makeMedia(mediaByOwner);
  const service = new SiteMediaService(
    prisma as never,
    media as never,
    revalidator as never,
  );
  return { service, prisma, media };
}

describe('getPublicList', () => {
  it('returns only slots that have media', async () => {
    const item = { publicId: 'p', url: 'u' };
    const { service } = makeService([HERO_SLOT, STORY_SLOT], {
      [HERO_SLOT.id]: [item],
    });
    const list = await service.getPublicList();
    expect(list).toEqual([{ key: 'home-hero', media: [item] }]);
  });
});

describe('findAllForAdmin', () => {
  it('returns the full catalog in order with kind/label/group and current media', async () => {
    const { service } = makeService([HERO_SLOT, STORY_SLOT], {
      [STORY_SLOT.id]: [{ publicId: 'p1' }],
    });
    const list = await service.findAllForAdmin();
    // Catalog defines 9 slots; only the 2 seeded in this test carry DB rows —
    // admin still sees every catalog entry (missing DB row → empty media).
    expect(list).toHaveLength(9);
    const hero = list.find((s) => s.key === 'home-hero');
    expect(hero).toMatchObject({ kind: 'single', group: 'Home', media: [] });
    const story = list.find((s) => s.key === 'about-story');
    expect(story).toMatchObject({
      kind: 'gallery',
      media: [{ publicId: 'p1' }],
    });
    expect(list.map((s) => s.key)[0]).toBe('home-hero');
  });
});

describe('setSlotMedia', () => {
  it('busts the web site-media cache post-commit (bust failure never surfaces)', async () => {
    const revalidateTags = jest.fn().mockRejectedValue(new Error('web down'));
    const { service } = makeService(
      [HERO_SLOT, STORY_SLOT],
      {},
      {
        revalidateTags,
      },
    );

    await expect(
      service.setSlotMedia('home-hero', [heroInput]),
    ).resolves.toBeDefined();
    expect(revalidateTags).toHaveBeenCalledWith(['site-media']);
  });

  it('rejects an unknown slot key with SITE_SLOT_NOT_FOUND', async () => {
    const { service } = makeService();
    await expect(service.setSlotMedia('nope', [heroInput])).rejects.toThrow(
      NotFoundException,
    );
  });

  it('rejects more than one image on a single slot', async () => {
    const { service } = makeService();
    await expect(
      service.setSlotMedia('home-hero', [heroInput, heroInput]),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a wrong role for the slot kind (single wants hero, gallery wants gallery)', async () => {
    const { service } = makeService();
    await expect(
      service.setSlotMedia('home-hero', [galleryInput(1)]),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.setSlotMedia('about-story', [heroInput]),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects more than 8 gallery images', async () => {
    const { service } = makeService();
    const nine = Array.from({ length: 9 }, (_, i) => galleryInput(i));
    await expect(service.setSlotMedia('about-story', nine)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects video assets (site chrome is image-only)', async () => {
    const { service } = makeService();
    await expect(
      service.setSlotMedia('home-hero', [
        { ...heroInput, type: MediaType.VIDEO },
      ]),
    ).rejects.toThrow(BadRequestException);
  });

  it('replace-syncs a valid single set on the slot owner and returns the new media', async () => {
    const item = { publicId: heroInput.publicId, url: 'u' };
    const { service, media } = makeService([HERO_SLOT, STORY_SLOT], {
      [HERO_SLOT.id]: [item],
    });
    const result = await service.setSlotMedia('home-hero', [heroInput]);
    expect(media.syncAssets).toHaveBeenCalledWith(
      'tx',
      MediaOwnerType.SITE,
      HERO_SLOT.id,
      [heroInput],
    );
    expect(result).toEqual([item]);
  });

  it('accepts an empty set as reset', async () => {
    const { service, media } = makeService();
    const result = await service.setSlotMedia('home-hero', []);
    expect(media.syncAssets).toHaveBeenCalledWith(
      'tx',
      MediaOwnerType.SITE,
      HERO_SLOT.id,
      [],
    );
    expect(result).toEqual([]);
  });
});
