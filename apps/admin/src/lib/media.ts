/**
 * Shared media helpers for the admin image-upload widget (destinations, tours, …). Pure functions —
 * no entity coupling. The FE uploads to Cloudinary, then submits the desired set as replace-all.
 */

export interface MediaInput {
  publicId: string;
  role: 'hero' | 'gallery';
  format?: string;
  width?: number;
  height?: number;
  /** Preview URL for items loaded on edit; just-uploaded items derive it from cloudName+publicId. */
  url?: string;
}

export interface MediaPayload {
  publicId: string;
  type: 'IMAGE';
  role: 'hero' | 'gallery';
  format?: string;
  width?: number;
  height?: number;
  sortOrder: number;
}

export const MAX_GALLERY = 9;

/** Safe-parse the form's hidden media JSON; keep valid items, ≤1 hero, ≤9 gallery. */
export function parseMediaField(json: string): MediaInput[] {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) return [];
  const valid = raw.filter(
    (m): m is MediaInput =>
      !!m &&
      typeof (m as MediaInput).publicId === 'string' &&
      ((m as MediaInput).role === 'hero' || (m as MediaInput).role === 'gallery'),
  );
  const hero = valid.filter((m) => m.role === 'hero').slice(0, 1);
  const gallery = valid.filter((m) => m.role === 'gallery').slice(0, MAX_GALLERY);
  return [...hero, ...gallery];
}

/** Shape the list as the API's replace-all media set: hero first (sortOrder 0), then gallery. */
export function assembleMediaSet(items: MediaInput[]): MediaPayload[] {
  const hero = items.filter((m) => m.role === 'hero').slice(0, 1);
  const gallery = items.filter((m) => m.role === 'gallery');
  return [...hero, ...gallery].map((m, i) => ({
    publicId: m.publicId,
    type: 'IMAGE',
    role: m.role,
    format: m.format,
    width: m.width,
    height: m.height,
    sortOrder: i,
  }));
}

/** Cloudinary delivery URL for a just-uploaded image (preview before the BE read provides one). */
export function cloudinaryUrl(cloudName: string, publicId: string, format?: string): string {
  const base = `https://res.cloudinary.com/${cloudName}/image/upload/${publicId}`;
  return format ? `${base}.${format}` : base;
}
