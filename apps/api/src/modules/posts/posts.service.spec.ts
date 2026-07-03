import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma, PostStatus, MediaOwnerType, MediaRole } from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import type { MediaService } from '../media/media.service';
import type { ToursService } from '../tours/tours.service';
import { PostsService } from './posts.service';
import type { CreatePostDto } from './dto/create-post.dto';
import type { ListPostsQueryDto } from './dto/list-posts-query.dto';

const knownError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError(code, { code, clientVersion: 'x' });

function makePrisma(
  overrides: Record<string, unknown> = {},
  extra: Record<string, unknown> = {},
): PrismaService {
  const p: Record<string, unknown> = {
    post: {
      create: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      ...overrides,
    },
    tour: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    postTag: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    ...extra,
  };
  p.$transaction = jest
    .fn()
    .mockImplementation((fn: (tx: unknown) => Promise<unknown>) => fn(p));
  return p as unknown as PrismaService;
}

/** MediaService stub — attach passes `media: []` through; writes are no-ops. */
function makeMedia(over: Record<string, unknown> = {}): MediaService {
  return {
    syncAssets: jest.fn().mockResolvedValue(undefined),
    deleteForOwner: jest.fn().mockResolvedValue(undefined),
    attachToOwner: jest
      .fn()
      .mockImplementation((_t: unknown, owner: object) => Promise.resolve({ ...owner, media: [] })),
    attachToOwners: jest
      .fn()
      .mockImplementation((_t: unknown, owners: object[]) =>
        Promise.resolve(owners.map((o) => ({ ...o, media: [] }))),
      ),
    ...over,
  } as unknown as MediaService;
}

/** ToursService stub — summaries resolve empty unless a test overrides. */
function makeTours(over: Record<string, unknown> = {}): ToursService {
  return {
    findSummariesByIds: jest.fn().mockResolvedValue([]),
    ...over,
  } as unknown as ToursService;
}

const makeSvc = (
  prisma = makePrisma(),
  media = makeMedia(),
  tours = makeTours(),
) => new PostsService(prisma, media, tours);

const AUTHOR = 'admin-1';

describe('PostsService', () => {
  it('create slugs from title, defaults DRAFT, leaves publishedAt null, sets author', async () => {
    const create = jest
      .fn()
      .mockImplementation(({ data }) =>
        Promise.resolve({ id: '1', ...data, tags: [], author: { id: 'u', fullName: null } }),
      );
    const svc = makeSvc(makePrisma({ create }), makeMedia());

    await svc.create({ title: 'Three Days in Hội An', content: '# hi' } as CreatePostDto, AUTHOR);

    const data = create.mock.calls[0][0].data;
    expect(data.slug).toBe('three-days-in-hoi-an');
    expect(data.status).toBe(PostStatus.DRAFT);
    expect(data.publishedAt).toBeNull();
    expect(data.authorId).toBe(AUTHOR);
  });

  it('create stamps publishedAt when created PUBLISHED', async () => {
    const create = jest
      .fn()
      .mockImplementation(({ data }) =>
        Promise.resolve({ id: '1', ...data, tags: [], author: { id: 'u', fullName: null } }),
      );
    const svc = makeSvc(makePrisma({ create }), makeMedia());

    await svc.create(
      { title: 'Live', content: 'x', status: PostStatus.PUBLISHED } as CreatePostDto,
      AUTHOR,
    );

    expect(create.mock.calls[0][0].data.publishedAt).toBeInstanceOf(Date);
  });

  it('create rejects a symbol-only title (400)', async () => {
    const svc = makeSvc(makePrisma(), makeMedia());
    await expect(
      svc.create({ title: '!!!', content: 'x' } as CreatePostDto, AUTHOR),
    ).rejects.toThrow(BadRequestException);
  });

  it('create maps a unique-constraint (P2002) to 409', async () => {
    const create = jest.fn().mockRejectedValue(knownError('P2002'));
    const svc = makeSvc(makePrisma({ create }), makeMedia());
    await expect(
      svc.create({ title: 'X', slug: 'x', content: 'y' } as CreatePostDto, AUTHOR),
    ).rejects.toThrow(ConflictException);
  });

  it('findPublicList forces PUBLISHED + publishedAt<=now and computes meta', async () => {
    const findMany = jest
      .fn()
      .mockResolvedValue([{ id: '1', tags: [], author: { id: 'u1', fullName: null } }]);
    const count = jest.fn().mockResolvedValue(25);
    const svc = makeSvc(makePrisma({ findMany, count }), makeMedia());

    const res = await svc.findPublicList({ page: 2, pageSize: 12 });

    const where = findMany.mock.calls[0][0].where;
    expect(where.status).toBe(PostStatus.PUBLISHED);
    expect(where.publishedAt.lte).toBeInstanceOf(Date);
    expect(res.meta).toEqual({ page: 2, pageSize: 12, total: 25, totalPages: 3 });
  });

  it('findPublicBySlug throws 404 when missing', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const svc = makeSvc(makePrisma({ findFirst }), makeMedia());
    await expect(svc.findPublicBySlug('nope')).rejects.toThrow(NotFoundException);
  });

  it('update stamps publishedAt the first time status flips to PUBLISHED', async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValue({ id: '1', slug: 'x', status: PostStatus.DRAFT, publishedAt: null });
    const update = jest
      .fn()
      .mockImplementation(({ data }) =>
        Promise.resolve({ id: '1', ...data, tags: [], author: { id: 'u', fullName: null } }),
      );
    const svc = makeSvc(makePrisma({ findUnique, update }), makeMedia());

    await svc.update('x', { status: PostStatus.PUBLISHED });

    expect(update.mock.calls[0][0].data.publishedAt).toBeInstanceOf(Date);
  });

  it('update throws 404 when the post is missing', async () => {
    const findUnique = jest.fn().mockResolvedValue(null);
    const svc = makeSvc(makePrisma({ findUnique }), makeMedia());
    await expect(svc.update('nope', { title: 'x' })).rejects.toThrow(NotFoundException);
  });

  it('remove throws 404 when the post is missing', async () => {
    const findUnique = jest.fn().mockResolvedValue(null);
    const svc = makeSvc(makePrisma({ findUnique }), makeMedia());
    await expect(svc.remove('nope')).rejects.toThrow(NotFoundException);
  });

  it('findDetailForAdmin returns the post with its author', async () => {
    const findUnique = jest.fn().mockResolvedValue({
      id: '1',
      slug: 'x',
      author: { id: 'u1', fullName: 'Ana Admin', email: 'ana@nexora.travel' },
      tags: [],
      relatedTours: [],
    });
    const svc = makeSvc(makePrisma({ findUnique }), makeMedia());

    const res = await svc.findDetailForAdmin('x');

    expect(findUnique).toHaveBeenCalledWith({
      where: { slug: 'x' },
      include: {
        author: { select: { id: true, fullName: true, email: true } },
        tags: { include: { tag: true } },
        relatedTours: {
          orderBy: { order: 'asc' },
          include: { tour: { select: { slug: true, title: true, isPublished: true } } },
        },
      },
    });
    expect(res.author).toEqual({ fullName: 'Ana Admin', email: 'ana@nexora.travel', avatarUrl: null });
  });

  it('findDetailForAdmin throws 404 when the post is missing', async () => {
    const findUnique = jest.fn().mockResolvedValue(null);
    const svc = makeSvc(makePrisma({ findUnique }), makeMedia());
    await expect(svc.findDetailForAdmin('nope')).rejects.toThrow(NotFoundException);
  });

  it('list attaches media to every row', async () => {
    const rows = [
      { id: 'p1', tags: [], author: { id: 'u1', fullName: null } },
      { id: 'p2', tags: [], author: { id: 'u2', fullName: null } },
    ];
    const findMany = jest.fn().mockResolvedValue(rows);
    const count = jest.fn().mockResolvedValue(2);
    const media = makeMedia();
    const svc = makeSvc(makePrisma({ findMany, count }), media);

    const res = await svc.findAll({});

    expect(media.attachToOwners).toHaveBeenCalledWith(MediaOwnerType.POST, rows);
    expect(res.items[0].media).toEqual([]);
  });

  it('findPublicBySlug attaches media', async () => {
    const row = { id: 'p1', slug: 'x', tags: [], author: { id: 'u1', fullName: null }, relatedTours: [] };
    const findFirst = jest.fn().mockResolvedValue(row);
    const media = makeMedia();
    const svc = makeSvc(makePrisma({ findFirst }), media);

    const res = await svc.findPublicBySlug('x');

    const { relatedTours: _relatedTours, ...expectedRow } = row;
    expect(media.attachToOwners).toHaveBeenCalledWith(MediaOwnerType.POST, [expectedRow]);
    expect(res.media).toEqual([]);
  });

  it('findDetailForAdmin resolves the author avatar url', async () => {
    const findUnique = jest.fn().mockResolvedValue({
      id: 'p1',
      slug: 'x',
      author: { id: 'u1', fullName: 'Ana', email: 'a@x.com' },
      tags: [],
      relatedTours: [],
    });
    const media = makeMedia({
      attachToOwner: jest
        .fn()
        .mockImplementation((type: MediaOwnerType, owner: { id: string }) =>
          Promise.resolve(
            type === MediaOwnerType.USER
              ? { ...owner, media: [{ url: 'https://cdn/avatar.jpg', role: 'avatar' }] }
              : { ...owner, media: [] },
          ),
        ),
    });
    const svc = makeSvc(makePrisma({ findUnique }), media);

    const res = await svc.findDetailForAdmin('x');

    expect(res.author.avatarUrl).toBe('https://cdn/avatar.jpg');
    expect(res.media).toEqual([]);
  });

  it('setMedia syncs the replace-all set and returns the new media', async () => {
    const findUnique = jest.fn().mockResolvedValue({ id: 'p1' });
    const media = makeMedia();
    const svc = makeSvc(makePrisma({ findUnique }), media);

    const res = await svc.setMedia('x', []);

    expect(media.syncAssets).toHaveBeenCalledWith(
      expect.anything(),
      MediaOwnerType.POST,
      'p1',
      [],
      { preserveRoles: [MediaRole.body] },
    );
    expect(res).toEqual([]);
  });

  it('setMedia preserves body-role assets through the replace-all', async () => {
    const findUnique = jest.fn().mockResolvedValue({ id: 'p1' });
    const syncAssets = jest.fn().mockResolvedValue(undefined);
    const media = makeMedia({ syncAssets });
    const svc = makeSvc(makePrisma({ findUnique }), media, makeTours());

    await svc.setMedia('p', []);

    expect(syncAssets.mock.calls[0][4]).toEqual({ preserveRoles: [MediaRole.body] });
  });

  it('setMedia throws 404 when the post is missing', async () => {
    const findUnique = jest.fn().mockResolvedValue(null);
    const svc = makeSvc(makePrisma({ findUnique }), makeMedia());
    await expect(svc.setMedia('nope', [])).rejects.toThrow(NotFoundException);
  });

  it('remove deletes the post media in the same transaction', async () => {
    const findUnique = jest.fn().mockResolvedValue({ id: 'p1', slug: 'x' });
    const del = jest.fn().mockResolvedValue({ id: 'p1', slug: 'x' });
    const media = makeMedia();
    const svc = makeSvc(makePrisma({ findUnique, delete: del }), media);

    await svc.remove('x');

    expect(media.deleteForOwner).toHaveBeenCalledWith(expect.anything(), MediaOwnerType.POST, 'p1');
    expect(del).toHaveBeenCalledWith({ where: { slug: 'x' } });
  });

  it('addBodyImage resolves the slug and registers a body asset', async () => {
    const findUnique = jest.fn().mockResolvedValue({ id: 'p1' });
    const registerAsset = jest.fn().mockResolvedValue({ url: 'https://cdn/x.jpg' });
    const svc = makeSvc(makePrisma({ findUnique }), makeMedia({ registerAsset }), makeTours());

    await expect(svc.addBodyImage('p', { publicId: 'pid' })).resolves.toEqual({
      url: 'https://cdn/x.jpg',
    });
    expect(registerAsset).toHaveBeenCalledWith(
      MediaOwnerType.POST,
      'p1',
      MediaRole.body,
      { publicId: 'pid' },
    );
  });

  it('addBodyImage 404s an unknown slug', async () => {
    const svc = makeSvc(makePrisma({ findUnique: jest.fn().mockResolvedValue(null) }), makeMedia(), makeTours());
    await expect(svc.addBodyImage('ghost', { publicId: 'x' })).rejects.toMatchObject({
      response: { code: 'POST_NOT_FOUND' },
    });
  });
});

describe('tags + related tours (writes)', () => {
  it('create maps tag names to connectOrCreate-by-slug and collapses duplicates', async () => {
    const create = jest
      .fn()
      .mockImplementation(({ data }) =>
        Promise.resolve({ id: '1', ...data, tags: [], author: { id: 'u', fullName: null } }),
      );
    const svc = makeSvc(makePrisma({ create }), makeMedia(), makeTours());

    await svc.create(
      { title: 'T', content: 'c', tags: ['Hạ Long', 'ha long', 'Cruises'] } as CreatePostDto,
      AUTHOR,
    );

    const tagCreates = create.mock.calls[0][0].data.tags.create;
    expect(tagCreates).toHaveLength(2); // "Hạ Long" + "ha long" collapse to ha-long
    expect(tagCreates[0].tag.connectOrCreate.where).toEqual({ slug: 'ha-long' });
    expect(tagCreates[0].tag.connectOrCreate.create).toEqual({ slug: 'ha-long', name: 'Hạ Long' });
    expect(tagCreates[1].tag.connectOrCreate.where).toEqual({ slug: 'cruises' });
  });

  it('create rejects a symbol-only tag with 400 INVALID_TAG', async () => {
    const svc = makeSvc();
    await expect(
      svc.create({ title: 'T', content: 'c', tags: ['***'] } as CreatePostDto, AUTHOR),
    ).rejects.toMatchObject({ response: { code: 'INVALID_TAG' } });
  });

  it('create resolves related tour slugs to ordered connects', async () => {
    const create = jest
      .fn()
      .mockImplementation(({ data }) =>
        Promise.resolve({ id: '1', ...data, tags: [], author: { id: 'u', fullName: null } }),
      );
    const prisma = makePrisma({ create }, {
      tour: {
        findMany: jest.fn().mockResolvedValue([
          { id: 't2', slug: 'second' },
          { id: 't1', slug: 'first' },
        ]),
      },
    });
    const svc = makeSvc(prisma, makeMedia(), makeTours());

    await svc.create(
      { title: 'T', content: 'c', relatedTourSlugs: ['first', 'second'] } as CreatePostDto,
      AUTHOR,
    );

    const linkCreates = create.mock.calls[0][0].data.relatedTours.create;
    expect(linkCreates).toEqual([
      { order: 0, tour: { connect: { id: 't1' } } },
      { order: 1, tour: { connect: { id: 't2' } } },
    ]);
  });

  it('create rejects an unknown related tour slug with 400 RELATED_TOUR_NOT_FOUND', async () => {
    const prisma = makePrisma({}, { tour: { findMany: jest.fn().mockResolvedValue([]) } });
    const svc = makeSvc(prisma, makeMedia(), makeTours());
    await expect(
      svc.create(
        { title: 'T', content: 'c', relatedTourSlugs: ['ghost'] } as CreatePostDto,
        AUTHOR,
      ),
    ).rejects.toMatchObject({ response: { code: 'RELATED_TOUR_NOT_FOUND' } });
  });

  it('update leaves links untouched when fields are undefined, clears on []', async () => {
    const findUnique = jest.fn().mockResolvedValue({ id: '1', slug: 'p', title: 'T', status: PostStatus.DRAFT, publishedAt: null });
    const update = jest
      .fn()
      .mockImplementation(({ data }) =>
        Promise.resolve({ id: '1', slug: 'p', ...data, tags: [], author: { id: 'u', fullName: null } }),
      );
    const svc = makeSvc(makePrisma({ findUnique, update }), makeMedia(), makeTours());

    await svc.update('p', { title: 'T2' });
    expect(update.mock.calls[0][0].data.tags).toBeUndefined();
    expect(update.mock.calls[0][0].data.relatedTours).toBeUndefined();

    await svc.update('p', { tags: [], relatedTourSlugs: [] });
    expect(update.mock.calls[1][0].data.tags).toEqual({ deleteMany: {} });
    expect(update.mock.calls[1][0].data.relatedTours).toEqual({ deleteMany: {} });
  });
});

describe('tags + author (reads)', () => {
  it('list filters by ?tag= and flattens tags + author with avatar', async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        id: '1',
        slug: 'p',
        tags: [{ tag: { slug: 'ha-long', name: 'Hạ Long' } }],
        author: { id: 'u1', fullName: 'Ana' },
      },
    ]);
    const media = makeMedia({
      attachToOwners: jest
        .fn()
        .mockImplementation((type: unknown, owners: { id: string }[]) =>
          Promise.resolve(
            owners.map((o) =>
              type === MediaOwnerType.USER
                ? { ...o, media: [{ url: 'https://cdn/avatar.jpg' }] }
                : { ...o, media: [] },
            ),
          ),
        ),
    });
    const svc = makeSvc(makePrisma({ findMany }), media, makeTours());

    const out = await svc.findPublicList({ tag: 'ha-long' } as ListPostsQueryDto);

    expect(findMany.mock.calls[0][0].where.tags).toEqual({ some: { tag: { slug: 'ha-long' } } });
    expect(out.items[0].tags).toEqual([{ slug: 'ha-long', name: 'Hạ Long' }]);
    expect(out.items[0].author).toEqual({ fullName: 'Ana', avatarUrl: 'https://cdn/avatar.jpg' });
  });

  it('findPublicBySlug returns published related-tour summaries in pick order', async () => {
    const findFirst = jest.fn().mockResolvedValue({
      id: '1',
      slug: 'p',
      tags: [],
      author: { id: 'u1', fullName: null },
      relatedTours: [{ tourId: 't1' }, { tourId: 't2' }],
    });
    const tours = makeTours({
      findSummariesByIds: jest.fn().mockResolvedValue([{ id: 't1' }, { id: 't2' }]),
    });
    const svc = makeSvc(makePrisma({ findFirst }), makeMedia(), tours);

    const out = await svc.findPublicBySlug('p');

    expect(tours.findSummariesByIds).toHaveBeenCalledWith(['t1', 't2']);
    expect(out.relatedTours.map((t: { id: string }) => t.id)).toEqual(['t1', 't2']);
  });

  it('findPublicTags returns only tags with published posts, with counts', async () => {
    const tagFindMany = jest.fn().mockResolvedValue([
      { slug: 'cruises', name: 'Cruises', _count: { posts: 2 } },
      { slug: 'drafty', name: 'Drafty', _count: { posts: 0 } },
    ]);
    const prisma = makePrisma({}, { postTag: { findMany: tagFindMany } });
    const svc = makeSvc(prisma, makeMedia(), makeTours());

    await expect(svc.findPublicTags()).resolves.toEqual([
      { slug: 'cruises', name: 'Cruises', count: 2 },
    ]);
    // Published-only count filter reached the query:
    const select = tagFindMany.mock.calls[0][0].select;
    expect(select._count.select.posts.where.post.status).toBe(PostStatus.PUBLISHED);
  });
});
