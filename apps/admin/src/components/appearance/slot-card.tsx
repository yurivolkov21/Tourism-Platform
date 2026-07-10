'use client';

import { useRef, useState, useTransition } from 'react';
import { ImageIcon, RotateCcw, Trash2, Upload } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Card,
  CardContent,
  Spinner,
  toast,
} from '@tourism/ui';

import type { AdminSiteSlot } from '../../lib/appearance/data';
import { setSlotMedia } from '../../lib/appearance/actions';
import type { MediaPayload } from '../../lib/media';
import { uploadFile } from '../crud/media-field';

const ACCEPT = 'image/png,image/jpeg,image/webp';

// Mirrors the API's site-media gallery cap (GALLERY_MAX in slot-catalog.ts). Enforced
// client-side BEFORE uploading: a file uploaded to Cloudinary but rejected by the PUT
// would never enter media_assets — and thus never be garbage-collected.
const SITE_GALLERY_MAX = 8;

type SlotMedia = AdminSiteSlot['media'][number];

/** Shape the slot's desired media list as the replace-all payload (role per slot kind). */
function toPayload(
  kind: AdminSiteSlot['kind'],
  items: Array<Pick<SlotMedia, 'publicId' | 'width' | 'height'>>,
): MediaPayload[] {
  return items.map((m, i) => ({
    publicId: m.publicId,
    type: 'IMAGE',
    role: kind === 'single' ? 'hero' : 'gallery',
    width: m.width ?? undefined,
    height: m.height ?? undefined,
    sortOrder: i,
  }));
}

/**
 * One Appearance slot: preview (or a "Default" badge when unmanaged), Replace/Add
 * upload straight to Cloudinary, per-image remove for galleries, and Reset back to
 * the web's built-in default. Every change PUTs the full set immediately.
 */
export function SlotCard({ slot }: { slot: AdminSiteSlot }) {
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const managed = slot.media.length > 0;
  const busy = pending || uploading;

  function apply(
    items: Array<Pick<SlotMedia, 'publicId' | 'width' | 'height'>>,
  ) {
    startTransition(async () => {
      const result = await setSlotMedia(slot.key, toPayload(slot.kind, items));
      if (result.error) toast.error(result.error);
      else toast.success(`${slot.label} updated.`);
    });
  }

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    // Cap BEFORE uploading (like MediaField): a file that lands on Cloudinary but is
    // then rejected by the PUT would be untracked garbage forever.
    const room =
      slot.kind === 'single' ? 1 : SITE_GALLERY_MAX - slot.media.length;
    if (room <= 0) {
      toast.error(`This slot holds at most ${SITE_GALLERY_MAX} images.`);
      return;
    }
    const picked = Array.from(files).slice(0, room);
    if (picked.length < files.length) {
      toast.error(
        `Only ${room} more image${room === 1 ? '' : 's'} fit — extra files were skipped.`,
      );
    }
    setUploading(true);
    try {
      // Upload in parallel and KEEP partial successes (like MediaField) — a failed
      // file must not strand its already-uploaded batch-mates on Cloudinary.
      const results = await Promise.all(
        picked.map((file) =>
          uploadFile(
            file,
            slot.kind === 'single' ? 'hero' : 'gallery',
            'SITE_CHROME',
          ),
        ),
      );
      const failed = results.filter((r) => 'error' in r);
      if (failed.length > 0) {
        toast.error((failed[0] as { error: string }).error);
      }
      const uploaded = results
        .filter(
          (r): r is { item: import('../../lib/media').MediaInput } =>
            !('error' in r),
        )
        .map((r) => r.item);
      if (uploaded.length === 0) return;
      const next =
        slot.kind === 'single'
          ? uploaded.slice(0, 1)
          : [...slot.media, ...uploaded];
      apply(next);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-0.5">
            <p className="text-sm font-semibold">{slot.label}</p>
            <p className="text-muted-foreground text-xs text-pretty">
              {slot.hint}
            </p>
          </div>
          <Badge variant={managed ? 'default' : 'outline'}>
            {managed ? 'Managed' : 'Default'}
          </Badge>
        </div>

        {/* Preview */}
        {slot.kind === 'single' ? (
          <div className="bg-muted/40 relative aspect-video overflow-hidden rounded-lg border">
            {managed ? (
              // Plain <img> like the Media Library — the admin has no next/image remotePatterns.
              <img
                src={slot.media[0].url}
                alt={slot.label}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="text-muted-foreground flex h-full items-center justify-center gap-2 text-xs">
                <ImageIcon className="size-4" aria-hidden />
                Using the built-in default image
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {slot.media.map((m) => (
              <div
                key={m.publicId}
                className="bg-muted/40 group relative aspect-3/2 overflow-hidden rounded-md border"
              >
                <img
                  src={m.url}
                  alt={slot.label}
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <button
                  type="button"
                  aria-label="Remove image"
                  disabled={busy}
                  onClick={() =>
                    apply(slot.media.filter((x) => x.publicId !== m.publicId))
                  }
                  className="bg-overlay/60 absolute top-1 right-1 hidden cursor-pointer rounded-md p-1 text-white group-hover:block"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                </button>
              </div>
            ))}
            {slot.media.length === 0 ? (
              <div className="text-muted-foreground col-span-3 flex h-20 items-center justify-center gap-2 rounded-md border border-dashed text-xs">
                <ImageIcon className="size-4" aria-hidden />
                Using the built-in default set
              </div>
            ) : null}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT}
            multiple={slot.kind === 'gallery'}
            className="hidden"
            onChange={(e) => onFiles(e.target.files)}
          />
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? <Spinner /> : <Upload data-icon="inline-start" />}
            {slot.kind === 'single'
              ? managed
                ? 'Replace'
                : 'Set image'
              : 'Add images'}
          </Button>
          {managed ? (
            <>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => setConfirmReset(true)}
              >
                <RotateCcw data-icon="inline-start" />
                Reset
              </Button>
              <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Reset “{slot.label}” to the default?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      The uploaded image{slot.kind === 'gallery' ? 's' : ''}{' '}
                      will be removed and the site goes back to its built-in
                      default.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={pending}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        setConfirmReset(false);
                        apply([]);
                      }}
                    >
                      Reset to default
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export default SlotCard;
