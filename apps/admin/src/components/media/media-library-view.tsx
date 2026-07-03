'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import { ChevronDown, Film, ImageIcon, ListFilter, Search } from 'lucide-react';

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
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  Input,
  Separator,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  cn,
  toast,
} from '@tourism/ui';

import { ServerTablePagination } from '../crud/server-table-pagination';
import { deleteMediaAsset } from '../../lib/media-library/actions';
import type { AdminMediaAsset, PageMeta } from '../../lib/media-library/data';
import { formatBytes, ownerHref } from '../../lib/media-library/format';

const OWNER_OPTIONS = [
  { value: 'TOUR', label: 'Tours' },
  { value: 'DESTINATION', label: 'Destinations' },
  { value: 'POST', label: 'Posts' },
  { value: 'USER', label: 'Users' },
] as const;
const ROLE_OPTIONS = [
  { value: 'hero', label: 'Hero' },
  { value: 'gallery', label: 'Gallery' },
  { value: 'avatar', label: 'Avatar' },
] as const;
const TYPE_OPTIONS = [
  { value: 'IMAGE', label: 'Images' },
  { value: 'VIDEO', label: 'Videos' },
] as const;

interface MediaLibraryViewProps {
  rows: AdminMediaAsset[];
  meta?: PageMeta;
  ownerType?: string;
  role?: string;
  type?: string;
  search: string;
}

/** One single-choice URL-param facet (checkbox visuals, radio semantics). */
function FacetFilter({
  label,
  param,
  value,
  options,
  onSelect,
}: {
  label: string;
  param: string;
  value?: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  onSelect: (param: string, value: string | null) => void;
}) {
  const active = options.find((o) => o.value === value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            className="w-full justify-between font-normal sm:w-44"
            aria-label={`Filter by ${label.toLowerCase()}`}
          />
        }
      >
        <span className="inline-flex items-center gap-2">
          <ListFilter className="size-4 shrink-0" />
          <span className="truncate">{active ? active.label : label}</span>
        </span>
        <ChevronDown className="text-muted-foreground size-4 shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Filter by {label.toLowerCase()}</DropdownMenuLabel>
          {options.map((o) => (
            <DropdownMenuCheckboxItem
              key={o.value}
              checked={value === o.value}
              onCheckedChange={(checked) => onSelect(param, checked === true ? o.value : null)}
              closeOnClick={false}
            >
              {o.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
        {value ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onSelect(param, null)}>Clear filter</DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function MediaLibraryView({
  rows,
  meta,
  ownerType,
  role,
  type,
  search,
}: MediaLibraryViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [selected, setSelected] = useState<AdminMediaAsset | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, startDelete] = useTransition();

  const pushParams = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === '') next.delete(key);
      else next.set(key, value);
    }
    next.delete('page'); // any filter change resets pagination
    router.push(`${pathname}?${next.toString()}`);
  };

  const onDelete = () => {
    if (!selected) return;
    startDelete(async () => {
      const res = await deleteMediaAsset(selected.id);
      setConfirmOpen(false);
      if (res.ok) {
        setSelected(null);
        toast('Media deleted. Cloudinary cleanup is queued — see the Garbage tab.');
        router.refresh();
      } else {
        toast.error(res.error ?? 'Delete failed.');
      }
    });
  };

  const selectedHref = selected ? ownerHref(selected.ownerType, selected.ownerSlug) : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Filters + search */}
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <FacetFilter label="Owner" param="ownerType" value={ownerType} options={OWNER_OPTIONS} onSelect={(p, v) => pushParams({ [p]: v })} />
        <FacetFilter label="Role" param="role" value={role} options={ROLE_OPTIONS} onSelect={(p, v) => pushParams({ [p]: v })} />
        <FacetFilter label="Type" param="type" value={type} options={TYPE_OPTIONS} onSelect={(p, v) => pushParams({ [p]: v })} />
        <form
          className="relative w-full lg:ml-auto lg:max-w-xs"
          onSubmit={(e) => {
            e.preventDefault();
            const q = new FormData(e.currentTarget).get('q');
            pushParams({ q: typeof q === 'string' ? q.trim() : '' });
          }}
        >
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            type="search"
            name="q"
            defaultValue={search}
            placeholder="Search publicId or owner…"
            className="pl-8"
            aria-label="Search media"
          />
        </form>
      </div>

      {rows.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ImageIcon />
            </EmptyMedia>
            <EmptyTitle>No media found</EmptyTitle>
            <EmptyDescription>
              {ownerType || role || type || search
                ? 'Try different filters or clear the search.'
                : 'Images upload from the Tours, Destinations and Posts forms.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {rows.map((asset) => (
              <li key={asset.id}>
                <button
                  type="button"
                  onClick={() => setSelected(asset)}
                  className={cn(
                    'group border-border relative block w-full overflow-hidden rounded-lg border',
                    'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
                  )}
                  aria-label={`View ${asset.publicId}`}
                >
                  <span className="bg-muted relative block aspect-square">
                    <img
                      src={asset.type === 'VIDEO' ? (asset.posterUrl ?? asset.url) : asset.url}
                      alt={asset.ownerTitle ?? asset.publicId}
                      loading="lazy"
                      className="absolute inset-0 size-full object-cover transition-transform duration-200 group-hover:scale-105"
                    />
                    {asset.type === 'VIDEO' ? (
                      <span className="bg-background/80 absolute top-1.5 right-1.5 rounded-full p-1">
                        <Film className="size-3.5" aria-hidden />
                      </span>
                    ) : null}
                  </span>
                  <span className="flex items-center justify-between gap-2 px-2 py-1.5">
                    <span className="text-muted-foreground truncate text-xs">
                      {asset.ownerTitle ?? 'Unknown owner'}
                    </span>
                    <Badge variant="outline" className="shrink-0 text-[10px] capitalize">
                      {asset.role}
                    </Badge>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {meta ? (
            <ServerTablePagination
              page={meta.page}
              pageCount={meta.totalPages}
              total={meta.total}
              pageSize={meta.pageSize}
            />
          ) : null}
        </>
      )}

      {/* Detail drawer */}
      <Sheet open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-md">
          {selected ? (
            <>
              <SheetHeader>
                <SheetTitle className="truncate">
                  {selected.ownerTitle ?? 'Unknown owner'}
                </SheetTitle>
                <SheetDescription className="capitalize">
                  {selected.role} · {selected.type.toLowerCase()}
                </SheetDescription>
              </SheetHeader>
              <div className="flex flex-col gap-4 px-4 pb-6">
                <div className="bg-muted relative aspect-video overflow-hidden rounded-lg">
                  <img
                    src={selected.type === 'VIDEO' ? (selected.posterUrl ?? selected.url) : selected.url}
                    alt={selected.ownerTitle ?? selected.publicId}
                    className="absolute inset-0 size-full object-contain"
                  />
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <div className="space-y-0.5">
                    <dt className="text-muted-foreground text-xs">Dimensions</dt>
                    <dd className="text-sm font-medium">
                      {selected.width && selected.height
                        ? `${selected.width} × ${selected.height}`
                        : '—'}
                    </dd>
                  </div>
                  <div className="space-y-0.5">
                    <dt className="text-muted-foreground text-xs">Size</dt>
                    <dd className="text-sm font-medium">{formatBytes(selected.bytes) ?? '—'}</dd>
                  </div>
                  <div className="space-y-0.5">
                    <dt className="text-muted-foreground text-xs">Format</dt>
                    <dd className="text-sm font-medium uppercase">{selected.format ?? '—'}</dd>
                  </div>
                  <div className="space-y-0.5">
                    <dt className="text-muted-foreground text-xs">Uploaded</dt>
                    <dd className="text-sm font-medium">
                      {new Date(selected.createdAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </dd>
                  </div>
                </dl>
                <Separator />
                <div className="space-y-0.5">
                  <p className="text-muted-foreground text-xs">Public ID</p>
                  <p className="font-mono text-xs break-all">{selected.publicId}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-muted-foreground text-xs">Used in</p>
                  {selectedHref ? (
                    <Link href={selectedHref} className="text-primary text-sm hover:underline">
                      {selected.ownerTitle}
                    </Link>
                  ) : (
                    <p className="text-sm">{selected.ownerTitle ?? 'Unknown owner'}</p>
                  )}
                </div>
                {selected.ownerType !== 'USER' ? (
                  <>
                    <Separator />
                    <Button
                      variant="destructive"
                      onClick={() => setConfirmOpen(true)}
                      disabled={deleting}
                    >
                      Delete media
                    </Button>
                  </>
                ) : null}
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Delete confirm — controlled, outside the drawer per Base UI footguns */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this media?</AlertDialogTitle>
            <AlertDialogDescription>
              Removes it from {selected?.ownerTitle ?? 'its owner'} and permanently deletes it from
              Cloudinary within the day — or run cleanup now from the Garbage tab. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
