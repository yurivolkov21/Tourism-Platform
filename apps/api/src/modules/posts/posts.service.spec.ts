import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma, PostStatus, MediaOwnerType } from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import type { MediaService } from '../media/media.service';
import { PostsService } from './posts.service';
import type { CreatePostDto } from './dto/create-post.dto';

const knownError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError(code, { code, clientVersion: 'x' });

function makePrisma(overrides: Record<string, unknown> = {}): PrismaService {
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

const AUTHOR = 'admin-1';

describe('PostsService', () => {
  it('create slugs from title, defaults DRAFT, leaves publishedAt null, sets author', async () => {
    const create = jest
      .fn()
      .mockImplementation(({ data }) => Promise.resolve({ id: '1', ...data }));
    const svc = new PostsService(makePrisma({ create }), makeMedia());

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
      .mockImplementation(({ data }) => Promise.resolve({ id: '1', ...data }));
    const svc = new PostsService(makePrisma({ create }), makeMedia());

    await svc.create(
      { title: 'Live', content: 'x', status: PostStatus.PUBLISHED } as CreatePostDto,
      AUTHOR,
    );

    expect(create.mock.calls[0][0].data.publishedAt).toBeInstanceOf(Date);
  });

  it('create rejects a symbol-only title (400)', async () => {
    const svc = new PostsService(makePrisma(), makeMedia());
    await expect(
      svc.create({ title: '!!!', content: 'x' } as CreatePostDto, AUTHOR),
    ).rejects.toThrow(BadRequestException);
  });

  it('create maps a unique-constraint (P2002) to 409', async () => {
    const create = jest.fn().mockRejectedValue(knownError('P2002'));
    const svc = new PostsService(makePrisma({ create }), makeMedia());
    await expect(
      svc.create({ title: 'X', slug: 'x', content: 'y' } as CreatePostDto, AUTHOR),
    ).rejects.toThrow(ConflictException);
  });

  it('findPublicList forces PUBLISHED + publishedAt<=now and computes meta', async () => {
    const findMany = jest.fn().mockResolvedValue([{ id: '1' }]);
    const count = jest.fn().mockResolvedValue(25);
    const svc = new PostsService(makePrisma({ findMany, count }), makeMedia());

    const res = await svc.findPublicList({ page: 2, pageSize: 12 });

    const where = findMany.mock.calls[0][0].where;
    expect(where.status).toBe(PostStatus.PUBLISHED);
    expect(where.publishedAt.lte).toBeInstanceOf(Date);
    expect(res.meta).toEqual({ page: 2, pageSize: 12, total: 25, totalPages: 3 });
  });

  it('findPublicBySlug throws 404 when missing', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const svc = new PostsService(makePrisma({ findFirst }), makeMedia());
    await expect(svc.findPublicBySlug('nope')).rejects.toThrow(NotFoundException);
  });

  it('update stamps publishedAt the first time status flips to PUBLISHED', async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValue({ id: '1', slug: 'x', status: PostStatus.DRAFT, publishedAt: null });
    const update = jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: '1', ...data }));
    const svc = new PostsService(makePrisma({ findUnique, update }), makeMedia());

    await svc.update('x', { status: PostStatus.PUBLISHED });

    expect(update.mock.calls[0][0].data.publishedAt).toBeInstanceOf(Date);
  });

  it('update throws 404 when the post is missing', async () => {
    const findUnique = jest.fn().mockResolvedValue(null);
    const svc = new PostsService(makePrisma({ findUnique }), makeMedia());
    await expect(svc.update('nope', { title: 'x' })).rejects.toThrow(NotFoundException);
  });

  it('remove throws 404 when the post is missing', async () => {
    const findUnique = jest.fn().mockResolvedValue(null);
    const svc = new PostsService(makePrisma({ findUnique }), makeMedia());
    await expect(svc.remove('nope')).rejects.toThrow(NotFoundException);
  });

  it('findDetailForAdmin returns the post with its author', async () => {
    const findUnique = jest.fn().mockResolvedValue({
      id: '1',
      slug: 'x',
      author: { id: 'u1', fullName: 'Ana Admin', email: 'ana@nexora.travel' },
    });
    const svc = new PostsService(makePrisma({ findUnique }), makeMedia());

    const res = await svc.findDetailForAdmin('x');

    expect(findUnique).toHaveBeenCalledWith({
      where: { slug: 'x' },
      include: { author: { select: { id: true, fullName: true, email: true } } },
    });
    expect(res.author).toEqual({ fullName: 'Ana Admin', email: 'ana@nexora.travel', avatarUrl: null });
  });

  it('findDetailForAdmin throws 404 when the post is missing', async () => {
    const findUnique = jest.fn().mockResolvedValue(null);
    const svc = new PostsService(makePrisma({ findUnique }), makeMedia());
    await expect(svc.findDetailForAdmin('nope')).rejects.toThrow(NotFoundException);
  });

  it('list attaches media to every row', async () => {
    const findMany = jest.fn().mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);
    const count = jest.fn().mockResolvedValue(2);
    const media = makeMedia();
    const svc = new PostsService(makePrisma({ findMany, count }), media);

    const res = await svc.findAll({});

    expect(media.attachToOwners).toHaveBeenCalledWith(MediaOwnerType.POST, [
      { id: 'p1' },
      { id: 'p2' },
    ]);
    expect(res.items[0].media).toEqual([]);
  });

  it('findPublicBySlug attaches media', async () => {
    const findFirst = jest.fn().mockResolvedValue({ id: 'p1', slug: 'x' });
    const media = makeMedia();
    const svc = new PostsService(makePrisma({ findFirst }), media);

    const res = await svc.findPublicBySlug('x');

    expect(media.attachToOwner).toHaveBeenCalledWith(MediaOwnerType.POST, { id: 'p1', slug: 'x' });
    expect(res.media).toEqual([]);
  });

  it('findDetailForAdmin resolves the author avatar url', async () => {
    const findUnique = jest.fn().mockResolvedValue({
      id: 'p1',
      slug: 'x',
      author: { id: 'u1', fullName: 'Ana', email: 'a@x.com' },
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
    const svc = new PostsService(makePrisma({ findUnique }), media);

    const res = await svc.findDetailForAdmin('x');

    expect(res.author.avatarUrl).toBe('https://cdn/avatar.jpg');
    expect(res.media).toEqual([]);
  });

  it('setMedia syncs the replace-all set and returns the new media', async () => {
    const findUnique = jest.fn().mockResolvedValue({ id: 'p1' });
    const media = makeMedia();
    const svc = new PostsService(makePrisma({ findUnique }), media);

    const res = await svc.setMedia('x', []);

    expect(media.syncAssets).toHaveBeenCalledWith(expect.anything(), MediaOwnerType.POST, 'p1', []);
    expect(res).toEqual([]);
  });

  it('setMedia throws 404 when the post is missing', async () => {
    const findUnique = jest.fn().mockResolvedValue(null);
    const svc = new PostsService(makePrisma({ findUnique }), makeMedia());
    await expect(svc.setMedia('nope', [])).rejects.toThrow(NotFoundException);
  });

  it('remove deletes the post media in the same transaction', async () => {
    const findUnique = jest.fn().mockResolvedValue({ id: 'p1', slug: 'x' });
    const del = jest.fn().mockResolvedValue({ id: 'p1', slug: 'x' });
    const media = makeMedia();
    const svc = new PostsService(makePrisma({ findUnique, delete: del }), media);

    await svc.remove('x');

    expect(media.deleteForOwner).toHaveBeenCalledWith(expect.anything(), MediaOwnerType.POST, 'p1');
    expect(del).toHaveBeenCalledWith({ where: { slug: 'x' } });
  });
});
