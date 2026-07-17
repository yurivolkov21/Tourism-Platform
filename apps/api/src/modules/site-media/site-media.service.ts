import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { MediaOwnerType, MediaRole, MediaType } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { MediaService } from '../media/media.service';
import { MediaInputDto, MediaItemDto } from '../media/dto/media.dto';
import {
  WEB_TAGS,
  WebRevalidationService,
} from '../revalidation/web-revalidation.service';
import { GALLERY_MAX, SITE_SLOTS, slotDef } from './slot-catalog';

export interface SiteMediaSlotEntry {
  key: string;
  media: MediaItemDto[];
}

export interface AdminSiteMediaSlotEntry extends SiteMediaSlotEntry {
  kind: 'single' | 'gallery';
  label: string;
  group: string;
  hint: string;
}

/**
 * Brand-chrome site media. Slots come from the code catalog (`slot-catalog.ts`);
 * their images live in `media_assets` (ownerType=SITE, ownerId=slot uuid) via the
 * shared MediaService — same replace-all sync, delivery URLs, Media Library
 * visibility, and Cloudinary-garbage protection as every other owner. Empty slot
 * = the web renders its built-in default, so writes never risk a broken page.
 */
@Injectable()
export class SiteMediaService {
  private readonly logger = new Logger(SiteMediaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
    // Optional so hand-constructed unit tests keep compiling; DI always injects.
    private readonly revalidator?: WebRevalidationService,
  ) {}

  /** Public map source — only slots that actually carry managed media. */
  async getPublicList(): Promise<SiteMediaSlotEntry[]> {
    const slots = await this.prisma.siteMediaSlot.findMany();
    const withMedia = await this.media.attachToOwners(
      MediaOwnerType.SITE,
      slots,
    );
    return withMedia
      .filter((s) => s.media.length > 0)
      .map((s) => ({ key: s.key, media: s.media }));
  }

  /**
   * Admin list — the FULL catalog in catalog order (a catalog entry whose DB row
   * is somehow missing still shows, with empty media, so the surface never hides
   * a slot).
   */
  async findAllForAdmin(): Promise<AdminSiteMediaSlotEntry[]> {
    const slots = await this.prisma.siteMediaSlot.findMany();
    const withMedia = await this.media.attachToOwners(
      MediaOwnerType.SITE,
      slots,
    );
    const byKey = new Map(withMedia.map((s) => [s.key, s.media]));
    return SITE_SLOTS.map((def) => ({
      key: def.key,
      kind: def.kind,
      label: def.label,
      group: def.group,
      hint: def.hint,
      media: byKey.get(def.key) ?? [],
    }));
  }

  /**
   * Replace-all the slot's media (admin). Kind rules: `single` ⇒ at most 1 item,
   * role `hero`; `gallery` ⇒ up to {@link GALLERY_MAX}, role `gallery`. Site
   * chrome is image-only. An empty set resets the slot to the web default.
   */
  async setSlotMedia(
    key: string,
    media: MediaInputDto[],
  ): Promise<MediaItemDto[]> {
    const def = slotDef(key);
    const slot = def
      ? await this.prisma.siteMediaSlot.findUnique({ where: { key } })
      : null;
    if (!def || !slot) {
      throw new NotFoundException({
        code: 'SITE_SLOT_NOT_FOUND',
        message: `Unknown site-media slot '${key}'`,
      });
    }

    if (media.some((m) => m.type !== MediaType.IMAGE)) {
      throw new BadRequestException({
        code: 'SITE_MEDIA_IMAGES_ONLY',
        message: 'Site chrome slots accept images only',
      });
    }
    if (def.kind === 'single') {
      if (media.length > 1) {
        throw new BadRequestException({
          code: 'SITE_MEDIA_SINGLE_SLOT',
          message: `Slot '${key}' holds a single image`,
        });
      }
      if (media.some((m) => m.role !== MediaRole.hero)) {
        throw new BadRequestException({
          code: 'SITE_MEDIA_BAD_ROLE',
          message: `Slot '${key}' images must use role 'hero'`,
        });
      }
    } else {
      if (media.length > GALLERY_MAX) {
        throw new BadRequestException({
          code: 'SITE_MEDIA_GALLERY_LIMIT',
          message: `Slot '${key}' holds at most ${GALLERY_MAX} images`,
        });
      }
      if (media.some((m) => m.role !== MediaRole.gallery)) {
        throw new BadRequestException({
          code: 'SITE_MEDIA_BAD_ROLE',
          message: `Slot '${key}' images must use role 'gallery'`,
        });
      }
    }

    await this.prisma.$transaction((tx) =>
      this.media.syncAssets(tx, MediaOwnerType.SITE, slot.id, media),
    );
    const withMedia = await this.media.attachToOwner(MediaOwnerType.SITE, {
      id: slot.id,
    });
    this.logger.log(`Set ${media.length} media on site slot ${key}`);
    // Post-commit, fire-and-forget: brand chrome renders on the next request.
    void this.revalidator
      ?.revalidateTags([WEB_TAGS.SITE_MEDIA])
      .catch(() => undefined);
    return withMedia.media;
  }
}
