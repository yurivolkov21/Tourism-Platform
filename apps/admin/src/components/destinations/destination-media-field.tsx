'use client';

import { MediaField } from '../crud/media-field';
import type { MediaInput } from '../../lib/media';

/** Destination image widget — the shared {@link MediaField} pinned to the destination upload slots. */
export function DestinationMediaField({
  initial,
  onChange,
}: {
  initial: MediaInput[];
  onChange: (items: MediaInput[]) => void;
}) {
  return (
    <MediaField
      initial={initial}
      onChange={onChange}
      heroPurpose="DESTINATION_HERO"
      galleryPurpose="DESTINATION_GALLERY"
    />
  );
}

export default DestinationMediaField;
