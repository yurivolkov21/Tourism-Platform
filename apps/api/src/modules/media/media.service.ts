import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MediaOwnerType, MediaRole, MediaType, Prisma } from '@prisma/client';
import { buildCloudinaryUrl } from '../../lib/cloudinary-url';
import { PrismaService } from '../../prisma/prisma.service';
import { MediaInputDto, MediaItemDto } from './dto/media.dto';

/** Row carrying an `id` we can attach media to. */
interface HasId {
  id: string;
}

/**
 * Single owner of `MediaAsset` access. Tours, destinations, and users all go
 * through here so the Cloudinary detail + polymorphic `(ownerType, ownerId)`
 * convention live in one place.
 *
 * Writes (`syncAssets`, `deleteForOwner`) accept a `Prisma.TransactionClient` so
 * the caller runs them inside the same transaction that mutates the owner row —
 * keeping media + owner atomic and avoiding orphaned assets. Reads
 * (`attachToOwners`) build delivery URLs from `publicId` at read time.
 */
@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Replace-all sync of an owner's media set. `assets` is the FULL desired set —
   * existing rows are deleted and recreated, so dropping an item from the payload
   * removes it from the DB. Runs on the supplied `tx` so it commits/rolls back
   * with the owner mutation.
   *
   * `opts.preserveRoles` carves those roles out of both the existing-read and the
   * delete, so e.g. a cover replace-all doesn't touch body-role rows managed by a
   * separate flow (blog inline images).
   */
  async syncAssets(
    tx: Prisma.TransactionClient,
    ownerType: MediaOwnerType,
    ownerId: string,
    assets: MediaInputDto[],
    opts?: { preserveRoles?: MediaRole[] },
  ): Promise<void> {
    const where: Prisma.MediaAssetWhereInput = {
      ownerType,
      ownerId,
      ...(opts?.preserveRoles?.length ? { role: { notIn: opts.preserveRoles } } : {}),
    };

    // Garbage-collect Cloudinary assets that are dropped and NOT recreated. Read
    // the current set first, then record any whose publicId isn't in the new
    // payload (a kept publicId is re-created, so it must not be destroyed).
    const existing = await tx.mediaAsset.findMany({
      where,
      select: { publicId: true, posterId: true, type: true },
    });
    const keptIds = new Set(assets.map((a) => a.publicId));
    await this.recordGarbage(
      tx,
      existing.filter((e) => !keptIds.has(e.publicId)),
    );

    await tx.mediaAsset.deleteMany({ where });
    if (assets.length === 0) return;

    await tx.mediaAsset.createMany({
      data: assets.map((a, index) => ({
        publicId: a.publicId,
        type: a.type,
        ownerType,
        ownerId,
        role: a.role,
        format: a.format ?? null,
        width: a.width ?? null,
        height: a.height ?? null,
        durationSec: a.durationSec ?? null,
        posterId: a.posterId ?? null,
        // Fall back to array index so callers get stable ordering even when the
        // FE omits explicit sortOrder.
        sortOrder: a.sortOrder ?? index,
      })),
    });
  }

  /**
   * Deletes every media asset for an owner. Used on owner hard-delete (no
   * DB-level FK cascade for the polymorphic relation).
   */
  async deleteForOwner(
    tx: Prisma.TransactionClient,
    ownerType: MediaOwnerType,
    ownerId: string,
  ): Promise<void> {
    // Every asset is removed and none recreated → all are Cloudinary garbage.
    const existing = await tx.mediaAsset.findMany({
      where: { ownerType, ownerId },
      select: { publicId: true, posterId: true, type: true },
    });
    await this.recordGarbage(tx, existing);
    await tx.mediaAsset.deleteMany({ where: { ownerType, ownerId } });
  }

  /**
   * Queue dropped assets for Cloudinary destruction (the pg-boss media-reconcile
   * cron — P1.x-b). Each asset contributes its `publicId` (resource_type from the
   * media type) plus its video `posterId` (always an image). `publicId` is UNIQUE,
   * so `skipDuplicates` collapses repeats. Runs on the caller's `tx`.
   */
  private async recordGarbage(
    tx: Prisma.TransactionClient,
    dropped: Array<{ publicId: string; posterId: string | null; type: MediaType }>,
  ): Promise<void> {
    if (dropped.length === 0) return;
    const rows: Array<{ publicId: string; resourceType: string }> = [];
    for (const asset of dropped) {
      rows.push({
        publicId: asset.publicId,
        resourceType: asset.type === MediaType.VIDEO ? 'video' : 'image',
      });
      if (asset.posterId) {
        rows.push({ publicId: asset.posterId, resourceType: 'image' });
      }
    }
    await tx.mediaGarbage.createMany({ data: rows, skipDuplicates: true });
  }

  /**
   * Attaches a `media` array (with built delivery URLs) to each owner row. One
   * query for the whole batch — no N+1. Returns NEW objects (inputs not mutated).
   */
  async attachToOwners<T extends HasId>(
    ownerType: MediaOwnerType,
    owners: T[],
  ): Promise<Array<T & { media: MediaItemDto[] }>> {
    if (owners.length === 0) return [];

    const cloudName = this.config.getOrThrow<string>('cloudinary.cloudName');
    const ownerIds = owners.map((o) => o.id);

    const assets = await this.prisma.mediaAsset.findMany({
      where: { ownerType, ownerId: { in: ownerIds } },
      orderBy: { sortOrder: 'asc' },
    });

    const byOwner = new Map<string, MediaItemDto[]>();
    for (const asset of assets) {
      const urls = buildCloudinaryUrl(cloudName, {
        type: asset.type,
        publicId: asset.publicId,
        posterId: asset.posterId,
      });
      const item: MediaItemDto = {
        publicId: asset.publicId,
        url: urls.url,
        type: asset.type,
        role: asset.role,
        posterUrl: urls.posterUrl,
        width: asset.width,
        height: asset.height,
        durationSec: asset.durationSec,
        sortOrder: asset.sortOrder,
      };
      const list = byOwner.get(asset.ownerId);
      if (list) list.push(item);
      else byOwner.set(asset.ownerId, [item]);
    }

    return owners.map((o) => ({ ...o, media: byOwner.get(o.id) ?? [] }));
  }

  /** Single-owner convenience wrapper around {@link attachToOwners}. */
  async attachToOwner<T extends HasId>(
    ownerType: MediaOwnerType,
    owner: T,
  ): Promise<T & { media: MediaItemDto[] }> {
    const [withMedia] = await this.attachToOwners(ownerType, [owner]);
    return withMedia;
  }

  /**
   * Registers ONE already-uploaded image for an owner (no replace-all — the body-image
   * insert path). Idempotent + race-free: upserts on the (ownerType, ownerId, publicId)
   * compound unique with a no-op update, so a re-register just returns the URL.
   */
  async registerAsset(
    ownerType: MediaOwnerType,
    ownerId: string,
    role: MediaRole,
    input: { publicId: string; width?: number; height?: number; format?: string },
  ): Promise<{ url: string }> {
    await this.prisma.mediaAsset.upsert({
      where: {
        ownerType_ownerId_publicId: { ownerType, ownerId, publicId: input.publicId },
      },
      update: {},
      create: {
        publicId: input.publicId,
        type: MediaType.IMAGE,
        ownerType,
        ownerId,
        role,
        format: input.format ?? null,
        width: input.width ?? null,
        height: input.height ?? null,
        sortOrder: 0,
      },
    });
    const cloudName = this.config.getOrThrow<string>('cloudinary.cloudName');
    return {
      url: buildCloudinaryUrl(cloudName, {
        type: MediaType.IMAGE,
        publicId: input.publicId,
      }).url,
    };
  }
}
