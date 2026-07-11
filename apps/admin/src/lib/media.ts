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
  /**
   * Editable alt text. Absent/`undefined` = untouched — the server preserves whatever is already
   * stored for a kept row. `null` is an explicit clear; a string ≤300 chars sets it.
   */
  alt?: string | null;
}

export interface MediaPayload {
  publicId: string;
  type: 'IMAGE';
  role: 'hero' | 'gallery';
  format?: string;
  width?: number;
  height?: number;
  sortOrder: number;
  /** Omitted unless the source item explicitly carries it (see {@link MediaInput.alt}). */
  alt?: string | null;
}

export const MAX_GALLERY = 9;

/**
 * Validates a raw `alt` value from parsed JSON: a string ≤300 chars or `null` are kept as-is
 * (explicit set/clear); anything else (undefined, a too-long string, a wrong type) drops the
 * property entirely so downstream treats it as "untouched" — the server preserves stored alt.
 */
function withValidAlt(m: MediaInput & { alt?: unknown }): MediaInput {
  const { alt, ...rest } = m;
  if (alt === null) return { ...rest, alt: null };
  if (typeof alt === 'string' && alt.length <= 300) return { ...rest, alt };
  return rest;
}

/** Safe-parse the form's hidden media JSON; keep valid items, ≤1 hero, ≤9 gallery. */
export function parseMediaField(json: string): MediaInput[] {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) return [];
  const valid = raw
    .filter(
      (m): m is MediaInput =>
        !!m &&
        typeof (m as MediaInput).publicId === 'string' &&
        ((m as MediaInput).role === 'hero' ||
          (m as MediaInput).role === 'gallery'),
    )
    .map((m) => withValidAlt(m as MediaInput & { alt?: unknown }));
  const hero = valid.filter((m) => m.role === 'hero').slice(0, 1);
  const gallery = valid
    .filter((m) => m.role === 'gallery')
    .slice(0, MAX_GALLERY);
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
    // Only carried when the item itself carries it — undefined must stay OMITTED (not sent as
    // `alt: undefined`, which JSON.stringify would drop anyway) so the server's "preserve on
    // omit" semantics apply to kept rows whose alt this form never touched.
    ...(m.alt !== undefined ? { alt: m.alt } : {}),
  }));
}

/**
 * Guards the "Choose from library" picker: an image already present in the target set (same
 * `publicId`) can't be added a second time — the DB's `(ownerType, ownerId, publicId)` unique
 * would reject the whole replace-all PUT.
 */
export function canAddToSet(
  items: Array<{ publicId: string }>,
  candidate: { publicId: string },
): boolean {
  return !items.some((i) => i.publicId === candidate.publicId);
}

/** Cloudinary delivery URL for a just-uploaded image (preview before the BE read provides one). */
export function cloudinaryUrl(
  cloudName: string,
  publicId: string,
  format?: string,
): string {
  const base = `https://res.cloudinary.com/${cloudName}/image/upload/${publicId}`;
  return format ? `${base}.${format}` : base;
}
