import { MediaType } from '@prisma/client';

const CLOUDINARY_BASE = 'https://res.cloudinary.com';

/** Image delivery transform: auto format + auto quality. */
const IMAGE_TRANSFORM = 'f_auto,q_auto';

/** Video poster transform: grab the first frame as a still. */
const VIDEO_POSTER_TRANSFORM = 'so_0';

/**
 * An absolute http(s) publicId is treated as a ready-made delivery URL and
 * returned unchanged. Seed/placeholder rows store full external URLs (e.g.
 * Unsplash) instead of a Cloudinary public_id; admin-uploaded media still
 * stores a bare public_id that gets the Cloudinary transform applied.
 */
function isAbsoluteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

/** Minimal asset shape needed to build delivery URLs. */
export interface CloudinaryUrlInput {
  type: MediaType;
  publicId: string;
  /** Optional dedicated poster image public_id (overrides the derived frame). */
  posterId?: string | null;
}

/** Resolved delivery URLs for a media asset. */
export interface CloudinaryUrls {
  /** Primary delivery URL (image or video). */
  url: string;
  /** Poster/thumbnail URL — present for videos only. */
  posterUrl?: string;
}

/**
 * Builds Cloudinary delivery URLs from a `cloudName` + asset.
 *
 * We store `public_id` (not full URLs) so transforms can change without a data
 * migration. Images get `f_auto,q_auto`; videos get a raw delivery URL plus a
 * poster (either a dedicated `posterId` image, or the first video frame via `so_0`).
 */
export function buildCloudinaryUrl(
  cloudName: string,
  asset: CloudinaryUrlInput,
): CloudinaryUrls {
  if (asset.type === MediaType.VIDEO) {
    const posterUrl = asset.posterId
      ? isAbsoluteUrl(asset.posterId)
        ? asset.posterId
        : `${CLOUDINARY_BASE}/${cloudName}/image/upload/${IMAGE_TRANSFORM}/${asset.posterId}`
      : `${CLOUDINARY_BASE}/${cloudName}/video/upload/${VIDEO_POSTER_TRANSFORM}/${asset.publicId}.jpg`;
    return {
      url: isAbsoluteUrl(asset.publicId)
        ? asset.publicId
        : `${CLOUDINARY_BASE}/${cloudName}/video/upload/${asset.publicId}`,
      posterUrl,
    };
  }

  if (isAbsoluteUrl(asset.publicId)) {
    return { url: asset.publicId };
  }

  return {
    url: `${CLOUDINARY_BASE}/${cloudName}/image/upload/${IMAGE_TRANSFORM}/${asset.publicId}`,
  };
}
