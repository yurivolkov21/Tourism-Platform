'use client';

import { useEffect, useState } from 'react';
import { ImageIcon, Search } from 'lucide-react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  cn,
  toast,
} from '@tourism/ui';

import { ErrorAlert } from './error-alert';
import { listLibraryMedia } from '../../lib/media-library/actions';
import type { AdminMediaAsset, PageMeta } from '../../lib/media-library/data';
import { canAddToSet, type MediaInput } from '../../lib/media';

const SEARCH_DEBOUNCE_MS = 350;
const PAGE_SIZE = 12;

const OWNER_OPTIONS = [
  { value: 'ALL', label: 'All owners' },
  { value: 'TOUR', label: 'Tours' },
  { value: 'DESTINATION', label: 'Destinations' },
  { value: 'POST', label: 'Posts' },
  { value: 'SITE', label: 'Site chrome' },
] as const;

/**
 * "Choose from library" picker for {@link MediaField} — lists existing IMAGE assets
 * (`listLibraryMedia`, forced `type=IMAGE`) with a debounced search + owner-type facet and simple
 * Prev/Next paging. Clicking a thumbnail hands a {@link MediaInput} (built from the asset, with the
 * field's target `role`) back to the caller and closes; a duplicate publicId is disabled inline
 * (the DB's compound unique would reject the whole replace-all otherwise).
 */
export function LibraryPickerDialog({
  open,
  onOpenChange,
  role,
  existing,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Role stamped on the picked item — the field's target slot for this picker instance. */
  role: 'hero' | 'gallery';
  /** The field's current items (both roles) — feeds the duplicate-publicId guard. */
  existing: MediaInput[];
  onPick: (item: MediaInput) => void;
}) {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [ownerType, setOwnerType] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<AdminMediaAsset[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset transient state on every fresh open.
  useEffect(() => {
    if (open) {
      setSearchInput('');
      setSearch('');
      setOwnerType('ALL');
      setPage(1);
    }
  }, [open]);

  // Debounce the search box → the actual query param.
  useEffect(() => {
    const id = setTimeout(
      () => setSearch(searchInput.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(id);
  }, [searchInput]);

  // Any filter change resets to page 1.
  useEffect(() => {
    setPage(1);
  }, [search, ownerType]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    setError(null);
    listLibraryMedia({
      page,
      pageSize: PAGE_SIZE,
      ownerType:
        ownerType === 'ALL'
          ? undefined
          : (ownerType as 'TOUR' | 'DESTINATION' | 'POST' | 'SITE'),
      search: search || undefined,
    }).then((res) => {
      if (!active) return;
      if (res.error || !res.data) {
        setError(res.error ?? 'Could not load the media library.');
        setRows([]);
        setMeta(null);
      } else {
        setRows(res.data.data);
        setMeta(res.data.meta);
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [open, page, ownerType, search]);

  function handlePick(asset: AdminMediaAsset) {
    if (!canAddToSet(existing, { publicId: asset.publicId })) {
      toast.error('Already in this set.');
      return;
    }
    onPick({
      publicId: asset.publicId,
      role,
      format: asset.format ?? undefined,
      width: asset.width ?? undefined,
      height: asset.height ?? undefined,
      url: asset.url,
      alt: asset.alt,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Choose from library</DialogTitle>
          <DialogDescription>
            Reuse an existing image as this{' '}
            {role === 'hero' ? 'hero image' : 'gallery image'}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search publicId or owner…"
              className="pl-8"
              aria-label="Search library"
            />
          </div>
          <Select
            value={ownerType}
            onValueChange={(v) => setOwnerType(v ?? 'ALL')}
          >
            <SelectTrigger
              className="w-full sm:w-44"
              aria-label="Filter by owner"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="start" alignItemWithTrigger={false}>
              {OWNER_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {error ? <ErrorAlert>{error}</ErrorAlert> : null}

        <div className="max-h-96 min-h-48 overflow-y-auto">
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <Spinner />
            </div>
          ) : rows.length === 0 && !error ? (
            <Empty className="border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ImageIcon />
                </EmptyMedia>
                <EmptyTitle>No images found</EmptyTitle>
                <EmptyDescription>
                  Try a different search or owner filter.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {rows.map((asset) => {
                const already = !canAddToSet(existing, {
                  publicId: asset.publicId,
                });
                return (
                  <li key={asset.id}>
                    <button
                      type="button"
                      onClick={() => handlePick(asset)}
                      disabled={already}
                      className={cn(
                        'group border-border relative block w-full cursor-pointer overflow-hidden rounded-lg border',
                        'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
                        already && 'cursor-not-allowed opacity-40',
                      )}
                      aria-label={
                        already
                          ? `${asset.publicId} (already added)`
                          : `Add ${asset.publicId}`
                      }
                    >
                      <span className="bg-muted relative block aspect-square">
                        <img
                          src={asset.url}
                          alt={asset.ownerTitle ?? asset.publicId}
                          loading="lazy"
                          className="absolute inset-0 size-full object-cover transition-transform duration-200 group-hover:scale-105"
                        />
                      </span>
                      <span className="text-muted-foreground block truncate px-1.5 py-1 text-[11px]">
                        {asset.publicId.split('/').pop()}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <DialogFooter className="items-center sm:justify-between">
          <span className="text-muted-foreground text-xs">
            {meta
              ? `Page ${meta.page} of ${meta.totalPages} · ${meta.total} image${meta.total === 1 ? '' : 's'}`
              : null}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!meta || page >= meta.totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default LibraryPickerDialog;
