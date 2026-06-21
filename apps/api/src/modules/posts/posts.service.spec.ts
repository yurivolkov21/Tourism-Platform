import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma, PostStatus } from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import { PostsService } from './posts.service';
import type { CreatePostDto } from './dto/create-post.dto';

const knownError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError(code, { code, clientVersion: 'x' });

function makePrisma(overrides: Record<string, unknown> = {}): PrismaService {
  return {
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
  } as unknown as PrismaService;
}

const AUTHOR = 'admin-1';

describe('PostsService', () => {
  it('create slugs from title, defaults DRAFT, leaves publishedAt null, sets author', async () => {
    const create = jest
      .fn()
      .mockImplementation(({ data }) => Promise.resolve({ id: '1', ...data }));
    const svc = new PostsService(makePrisma({ create }));

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
    const svc = new PostsService(makePrisma({ create }));

    await svc.create(
      { title: 'Live', content: 'x', status: PostStatus.PUBLISHED } as CreatePostDto,
      AUTHOR,
    );

    expect(create.mock.calls[0][0].data.publishedAt).toBeInstanceOf(Date);
  });

  it('create rejects a symbol-only title (400)', async () => {
    const svc = new PostsService(makePrisma());
    await expect(
      svc.create({ title: '!!!', content: 'x' } as CreatePostDto, AUTHOR),
    ).rejects.toThrow(BadRequestException);
  });

  it('create maps a unique-constraint (P2002) to 409', async () => {
    const create = jest.fn().mockRejectedValue(knownError('P2002'));
    const svc = new PostsService(makePrisma({ create }));
    await expect(
      svc.create({ title: 'X', slug: 'x', content: 'y' } as CreatePostDto, AUTHOR),
    ).rejects.toThrow(ConflictException);
  });

  it('findPublicList forces PUBLISHED + publishedAt<=now and computes meta', async () => {
    const findMany = jest.fn().mockResolvedValue([{ id: '1' }]);
    const count = jest.fn().mockResolvedValue(25);
    const svc = new PostsService(makePrisma({ findMany, count }));

    const res = await svc.findPublicList({ page: 2, pageSize: 12 });

    const where = findMany.mock.calls[0][0].where;
    expect(where.status).toBe(PostStatus.PUBLISHED);
    expect(where.publishedAt.lte).toBeInstanceOf(Date);
    expect(res.meta).toEqual({ page: 2, pageSize: 12, total: 25, totalPages: 3 });
  });

  it('findPublicBySlug throws 404 when missing', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const svc = new PostsService(makePrisma({ findFirst }));
    await expect(svc.findPublicBySlug('nope')).rejects.toThrow(NotFoundException);
  });

  it('update stamps publishedAt the first time status flips to PUBLISHED', async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValue({ id: '1', slug: 'x', status: PostStatus.DRAFT, publishedAt: null });
    const update = jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: '1', ...data }));
    const svc = new PostsService(makePrisma({ findUnique, update }));

    await svc.update('x', { status: PostStatus.PUBLISHED });

    expect(update.mock.calls[0][0].data.publishedAt).toBeInstanceOf(Date);
  });

  it('update throws 404 when the post is missing', async () => {
    const findUnique = jest.fn().mockResolvedValue(null);
    const svc = new PostsService(makePrisma({ findUnique }));
    await expect(svc.update('nope', { title: 'x' })).rejects.toThrow(NotFoundException);
  });

  it('remove throws 404 when the post is missing', async () => {
    const findUnique = jest.fn().mockResolvedValue(null);
    const svc = new PostsService(makePrisma({ findUnique }));
    await expect(svc.remove('nope')).rejects.toThrow(NotFoundException);
  });
});
