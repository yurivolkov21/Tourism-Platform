'use client';

import { useRef, useState } from 'react';
import { ImagePlus } from 'lucide-react';

import { Button, Spinner } from '@tourism/ui';

import { uploadFile } from '../crud/media-field';
import { ErrorAlert } from '../crud/error-alert';
import { registerBodyImage } from '../../lib/uploads';

const ACCEPT = 'image/png,image/jpeg,image/webp';

interface InsertImageButtonProps {
  /** Post slug that will own the asset — undefined on CREATE (button disabled + hint). */
  slug?: string;
  /** Receives the delivery URL once uploaded + registered. */
  onInsert: (url: string) => void;
}

/**
 * Uploads an image (signed direct-to-Cloudinary, POST_BODY purpose), registers it as a
 * post body asset, and hands the delivery URL back for markdown insertion. Edit-only —
 * a new post has no slug to own the asset yet.
 */
export function InsertImageButton({ slug, onInsert }: InsertImageButtonProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file || !slug) return;
    setBusy(true);
    setError(null);
    try {
      const up = await uploadFile(file, 'gallery', 'POST_BODY');
      if ('error' in up) {
        setError(up.error);
        return;
      }
      const registered = await registerBodyImage(slug, {
        publicId: up.item.publicId,
        width: up.item.width,
        height: up.item.height,
        format: up.item.format,
      });
      if (registered.error || !registered.url) {
        setError(registered.error ?? 'Could not register the image.');
        return;
      }
      onInsert(registered.url);
    } catch {
      setError('Could not register the image — check your connection and try again.');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!slug || busy}
          onClick={() => fileRef.current?.click()}
          className="cursor-pointer"
        >
          {busy ? <Spinner /> : <ImagePlus className="size-4" />}
          Insert image
        </Button>
        {!slug ? (
          <span className="text-muted-foreground text-xs">
            Save the draft first to insert images.
          </span>
        ) : null}
      </div>
      {error ? <ErrorAlert>{error}</ErrorAlert> : null}
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
    </div>
  );
}

export default InsertImageButton;
