import type { MediaListParams } from './data';

/**
 * The `/media` library hides USER-owned assets (customer avatars) by default —
 * at scale they would drown the content imagery. They stay fully tracked in
 * `media_assets` (GC + moderation), and two facets opt back in:
 * owner "User avatars" (explicit `ownerType` wins over the exclusion on the
 * API side) and role "avatar" (avatars are USER-owned, so excluding there
 * would always return an empty page).
 */
export function excludeUserOwnedFor(
  ownerType: MediaListParams['ownerType'],
  role: MediaListParams['role'],
): true | undefined {
  return ownerType === undefined && role !== 'avatar' ? true : undefined;
}
