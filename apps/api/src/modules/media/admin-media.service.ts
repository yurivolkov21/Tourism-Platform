import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MediaOwnerType, MediaRole, MediaType, Prisma } from '@prisma/client';
import { buildCloudinaryUrl } from '../../lib/cloudinary-url';
import { PrismaService } from '../../prisma/prisma.service';
import { MediaService } from './media.service';
import {
  MaintenanceService,
  ReconcileResult,
} from '../jobs/maintenance.service';
import { ListAdminMediaQueryDto } from './dto/list-admin-media-query.dto';
import { ListMediaGarbageQueryDto } from './dto/list-media-garbage-query.dto';

/** One library row — an owned asset with built URLs + its resolved owner. */
export interface AdminMediaAsset {
  id: string;
  publicId: string;
  url: string;
  posterUrl: string | null;
  type: MediaType;
  role: MediaRole;
  format: string | null;
  width: number | null;
  height: number | null;
  bytes: number | null;
  durationSec: number | null;
  sortOrder: number;
  createdAt: string;
  ownerType: MediaOwnerType;
  ownerId: string;
  /** Owning record's title/name — null when the owner row no longer exists. */
  ownerTitle: string | null;
  /** Owner page slug (tour/destination/post); null for USER owners. */
  ownerSlug: string | null;
  /** Editable alt text (web falls back to owner-derived text). */
  alt: string | null;
}

export interface PaginatedAdminMedia {
  items: AdminMediaAsset[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

/** Result of {@link AdminMediaService.deleteAsset} — the detached asset's identity. */
export interface DeletedMediaAsset {
  id: string;
  publicId: string;
}

/** One row of the deferred-destroy queue (`media_garbage`), as surfaced to the admin UI. */
export interface MediaGarbageRow {
  id: string;
  publicId: string;
  resourceType: string;
  attempts: number;
  lastError: string | null;
  createdAt: string;
}

export interface PaginatedMediaGarbage {
  items: MediaGarbageRow[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

/** Resolved owner display data, keyed `${ownerType}:${ownerId}`. */
type OwnerMap = Map<string, { title: string; slug: string | null }>;

/**
 * Admin media library reads + per-asset detach. Lives BESIDE `MediaService`
 * (which stays the owner-sync unit used by tour/destination/post forms):
 * this service is cross-owner — list/search over every asset, resolve the
 * polymorphic owner to a display title/slug, detach one asset into the
 * garbage queue, and surface/trigger the reconcile cron.
 */
@Injectable()
export class AdminMediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly maintenance: MaintenanceService,
    private readonly media: MediaService,
  ) {}

  async list(query: ListAdminMediaQueryDto): Promise<PaginatedAdminMedia> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const search = query.search?.trim();

    const where: Prisma.MediaAssetWhereInput = {
      ...(query.ownerType
        ? { ownerType: query.ownerType }
        : query.excludeUserOwned
          ? { ownerType: { not: MediaOwnerType.USER } }
          : {}),
      ...(query.role ? { role: query.role } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(search ? { OR: await this.searchClauses(search) } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.mediaAsset.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.mediaAsset.count({ where }),
    ]);

    const owners = await this.resolveOwners(rows);
    const cloudName = this.config.getOrThrow<string>('cloudinary.cloudName');

    return {
      items: rows.map((a) => {
        const urls = buildCloudinaryUrl(cloudName, {
          type: a.type,
          publicId: a.publicId,
          posterId: a.posterId,
        });
        const owner = owners.get(`${a.ownerType}:${a.ownerId}`);
        return {
          id: a.id,
          publicId: a.publicId,
          url: urls.url,
          posterUrl: urls.posterUrl ?? null,
          type: a.type,
          role: a.role,
          format: a.format,
          width: a.width,
          height: a.height,
          bytes: a.bytes,
          durationSec: a.durationSec,
          sortOrder: a.sortOrder,
          createdAt: a.createdAt.toISOString(),
          ownerType: a.ownerType,
          ownerId: a.ownerId,
          ownerTitle: owner?.title ?? null,
          ownerSlug: owner?.slug ?? null,
          alt: a.alt,
        };
      }),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  /**
   * OR clauses for `search`: publicId contains, plus "belongs to an owner whose
   * title/name matches" — matching owner ids are resolved first with four
   * parallel indexed lookups (no polymorphic join exists).
   */
  private async searchClauses(
    search: string,
  ): Promise<Prisma.MediaAssetWhereInput[]> {
    const contains = { contains: search, mode: 'insensitive' as const };
    const [tours, destinations, posts, users] = await Promise.all([
      this.prisma.tour.findMany({
        where: { title: contains },
        select: { id: true },
      }),
      this.prisma.destination.findMany({
        where: { name: contains },
        select: { id: true },
      }),
      this.prisma.post.findMany({
        where: { title: contains },
        select: { id: true },
      }),
      this.prisma.user.findMany({
        where: { OR: [{ fullName: contains }, { email: contains }] },
        select: { id: true },
      }),
    ]);

    const clauses: Prisma.MediaAssetWhereInput[] = [{ publicId: contains }];
    const byType: Array<[MediaOwnerType, Array<{ id: string }>]> = [
      [MediaOwnerType.TOUR, tours],
      [MediaOwnerType.DESTINATION, destinations],
      [MediaOwnerType.POST, posts],
      [MediaOwnerType.USER, users],
    ];
    for (const [ownerType, matches] of byType) {
      if (matches.length) {
        clauses.push({ ownerType, ownerId: { in: matches.map((m) => m.id) } });
      }
    }
    return clauses;
  }

  /** Batch-resolves owner display data for the page's rows (≤4 queries). */
  private async resolveOwners(
    rows: Array<{ ownerType: MediaOwnerType; ownerId: string }>,
  ): Promise<OwnerMap> {
    const idsByType = new Map<MediaOwnerType, Set<string>>();
    for (const r of rows) {
      const set = idsByType.get(r.ownerType) ?? new Set<string>();
      set.add(r.ownerId);
      idsByType.set(r.ownerType, set);
    }

    const map: OwnerMap = new Map();
    const tasks: Array<Promise<void>> = [];

    const tourIds = idsByType.get(MediaOwnerType.TOUR);
    if (tourIds?.size) {
      tasks.push(
        this.prisma.tour
          .findMany({
            where: { id: { in: [...tourIds] } },
            select: { id: true, title: true, slug: true },
          })
          .then((rs) => {
            for (const r of rs)
              map.set(`TOUR:${r.id}`, { title: r.title, slug: r.slug });
          }),
      );
    }
    const destinationIds = idsByType.get(MediaOwnerType.DESTINATION);
    if (destinationIds?.size) {
      tasks.push(
        this.prisma.destination
          .findMany({
            where: { id: { in: [...destinationIds] } },
            select: { id: true, name: true, slug: true },
          })
          .then((rs) => {
            for (const r of rs)
              map.set(`DESTINATION:${r.id}`, { title: r.name, slug: r.slug });
          }),
      );
    }
    const postIds = idsByType.get(MediaOwnerType.POST);
    if (postIds?.size) {
      tasks.push(
        this.prisma.post
          .findMany({
            where: { id: { in: [...postIds] } },
            select: { id: true, title: true, slug: true },
          })
          .then((rs) => {
            for (const r of rs)
              map.set(`POST:${r.id}`, { title: r.title, slug: r.slug });
          }),
      );
    }
    const userIds = idsByType.get(MediaOwnerType.USER);
    if (userIds?.size) {
      tasks.push(
        this.prisma.user
          .findMany({
            where: { id: { in: [...userIds] } },
            select: { id: true, fullName: true, email: true },
          })
          .then((rs) => {
            for (const r of rs) {
              map.set(`USER:${r.id}`, {
                title: r.fullName ?? r.email,
                slug: null,
              });
            }
          }),
      );
    }

    await Promise.all(tasks);
    return map;
  }

  /**
   * Detach ONE asset from its owner and queue its Cloudinary destruction —
   * atomic batch transaction (array form; pooler-safe). Mirrors
   * `MediaService.recordGarbage` semantics: the publicId with its resource
   * type, plus a video's dedicated poster image. USER-owned assets (customer
   * avatars) are not library content — 409.
   */
  async deleteAsset(id: string): Promise<DeletedMediaAsset> {
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id } });
    if (!asset) {
      throw new NotFoundException({
        code: 'MEDIA_NOT_FOUND',
        message: `Media asset "${id}" not found`,
      });
    }
    if (asset.ownerType === MediaOwnerType.USER) {
      throw new ConflictException({
        code: 'MEDIA_USER_OWNED',
        message:
          'User avatars are managed from the user account and cannot be deleted from the media library',
      });
    }

    // Delete first, then the GUARDED enqueue (MediaService.recordGarbage skips
    // any publicId another owner still references — the reuse picker makes
    // cross-owner sharing legal, so the old unconditional enqueue could
    // destroy a live image).
    await this.prisma.$transaction(async (tx) => {
      await tx.mediaAsset.delete({ where: { id } });
      await this.media.recordGarbage(tx, [
        {
          publicId: asset.publicId,
          posterId: asset.posterId,
          type: asset.type,
        },
      ]);
    });

    return { id: asset.id, publicId: asset.publicId };
  }

  /**
   * Sets or clears (null) an asset's alt text. Atomic — a concurrent delete
   * surfaces as a clean 404 via P2025, never a 500 (the B2 newsletter lesson).
   */
  async updateAlt(id: string, alt: string | null): Promise<void> {
    try {
      await this.prisma.mediaAsset.update({ where: { id }, data: { alt } });
    } catch (err) {
      if (
        err instanceof Object &&
        (err as { code?: string }).code === 'P2025'
      ) {
        throw new NotFoundException({
          code: 'MEDIA_NOT_FOUND',
          message: `Media asset "${id}" not found`,
        });
      }
      throw err;
    }
  }

  /**
   * Bulk delete for the library selection. USER-owned rows (avatars) are
   * SKIPPED (reported, not failed) — same policy as the single delete; unknown
   * ids are ignored. One transaction: rows first, then the GUARDED garbage
   * enqueue (a publicId reused by a surviving owner is never destroyed).
   */
  async bulkDelete(
    ids: string[],
  ): Promise<{ deleted: number; skipped: number }> {
    const rows = await this.prisma.mediaAsset.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        publicId: true,
        posterId: true,
        type: true,
        ownerType: true,
      },
    });
    const deletable = rows.filter((r) => r.ownerType !== MediaOwnerType.USER);
    const skipped = rows.length - deletable.length;
    if (deletable.length === 0) return { deleted: 0, skipped };

    // Report the tx's ACTUAL count — a concurrent delete of an overlapping
    // selection must not over-report in the toast.
    const deleted = await this.prisma.$transaction(async (tx) => {
      const res = await tx.mediaAsset.deleteMany({
        where: { id: { in: deletable.map((r) => r.id) } },
      });
      await this.media.recordGarbage(
        tx,
        deletable.map((r) => ({
          publicId: r.publicId,
          posterId: r.posterId,
          type: r.type,
        })),
      );
      return res.count;
    });
    return { deleted, skipped };
  }

  /** The deferred-destroy queue, oldest first (the cron's processing order). */
  async listGarbage(
    query: ListMediaGarbageQueryDto,
  ): Promise<PaginatedMediaGarbage> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const [rows, total] = await Promise.all([
      this.prisma.mediaGarbage.findMany({
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.mediaGarbage.count(),
    ]);

    return {
      items: rows.map((g) => ({
        id: g.id,
        publicId: g.publicId,
        resourceType: g.resourceType,
        attempts: g.attempts,
        lastError: g.lastError,
        createdAt: g.createdAt.toISOString(),
      })),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  /** Runs ONE reconcile batch immediately (same code path as the daily cron). */
  runReconcile(): Promise<ReconcileResult> {
    return this.maintenance.reconcileMedia();
  }
}
