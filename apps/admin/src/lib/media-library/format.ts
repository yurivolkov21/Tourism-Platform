/** Human-readable byte count — "512 B" / "2.0 KB" / "5.0 MB"; null when unknown. */
export function formatBytes(bytes: number | null | undefined): string | null {
  if (typeof bytes !== 'number') return null;
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

/** Admin route for a media owner; null when there is no page to link (USER / missing). */
export function ownerHref(
  ownerType: string,
  ownerSlug: string | null,
): string | null {
  if (!ownerSlug) return null;
  switch (ownerType) {
    case 'TOUR':
      return `/tours/${ownerSlug}`;
    case 'DESTINATION':
      return `/destinations/${ownerSlug}`;
    case 'POST':
      return `/posts/${ownerSlug}`;
    default:
      return null;
  }
}
