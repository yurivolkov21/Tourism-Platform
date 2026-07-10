'use server';

import { apiErrorMessage } from './api/error';
import { apiWrite } from './api/client';

/** Cloudinary direct-upload signature returned by `POST /admin/uploads/signed-url`. */
export interface SignParams {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
  publicId: string;
  uploadUrl: string;
}

/** Image upload slots the admin widget signs (per owner + role). */
export type UploadPurpose =
  | 'DESTINATION_HERO'
  | 'DESTINATION_GALLERY'
  | 'TOUR_HERO'
  | 'TOUR_GALLERY'
  | 'POST_COVER'
  | 'POST_BODY'
  | 'SITE_CHROME';

/**
 * Signs a direct-to-Cloudinary upload for any owner/role. The BE derives the target folder + a
 * unique public id from the `purpose` + filename, so a single generic action serves the shared
 * `MediaField` for destinations and tours alike.
 */
export async function signUpload(
  purpose: UploadPurpose,
  filename: string,
  contentType: string,
): Promise<{ params?: SignParams; error?: string }> {
  try {
    const data = await apiWrite<SignParams>(
      'POST',
      '/api/v1/admin/uploads/signed-url',
      {
        purpose,
        filename,
        contentType,
      },
    );
    return { params: data };
  } catch (e) {
    return { error: apiErrorMessage(e) };
  }
}

/**
 * Registers an already-uploaded Cloudinary image as a POST-owned `body` asset
 * (`POST /admin/posts/:slug/body-images`, idempotent) and returns its delivery URL for
 * markdown insertion. Server action — `apiWrite` is server-only, so the client-side
 * insert-image button goes through here.
 */
export async function registerBodyImage(
  slug: string,
  input: { publicId: string; width?: number; height?: number; format?: string },
): Promise<{ url?: string; error?: string }> {
  try {
    const data = await apiWrite<{ url: string }>(
      'POST',
      `/api/v1/admin/posts/${encodeURIComponent(slug)}/body-images`,
      input,
    );
    return { url: data.url };
  } catch (e) {
    return { error: apiErrorMessage(e) };
  }
}
