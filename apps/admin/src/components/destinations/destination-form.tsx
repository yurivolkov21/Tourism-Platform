'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';

import { REGION_ORDER } from '@tourism/core';
import {
  Button,
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Switch,
  Textarea,
} from '@tourism/ui';

import type { DestinationFormState } from '../../lib/destinations/actions';
import type { Destination } from '../../lib/destinations/data';
import type { MediaInput } from '../../lib/destinations/media';
import { slugify } from '../../lib/slugify';
import { DestinationMediaField } from './destination-media-field';
import { ErrorAlert } from '../crud/error-alert';

interface DestinationFormProps {
  /** Bound server action (create, or update with the slug already applied). */
  action: (
    prev: DestinationFormState,
    formData: FormData,
  ) => Promise<DestinationFormState>;
  /** Existing record when editing; omitted when creating. */
  destination?: Destination;
  submitLabel: string;
}

/**
 * Create/edit form for a destination — shadcn "Form Layout 2" (sectioned: a left title/description
 * column beside the fields). Slug auto-derives from the name (until the admin edits it), country is
 * fixed to Vietnam (Vietnam-only for now), and region is a fixed dropdown — all to keep the catalog
 * consistent. Shared by create + edit; the section shape is the template for other CRUD forms.
 */
export function DestinationForm({
  action,
  destination,
  submitLabel,
}: DestinationFormProps) {
  const [state, formAction, pending] = useActionState<
    DestinationFormState,
    FormData
  >(action, {});
  const [name, setName] = useState(destination?.name ?? '');
  const [slug, setSlug] = useState(destination?.slug ?? '');
  // On edit the slug is pre-set → treat as user-owned so editing the name doesn't clobber the URL.
  const [slugEdited, setSlugEdited] = useState(Boolean(destination?.slug));
  const [region, setRegion] = useState(destination?.region ?? '');
  const [isActive, setIsActive] = useState(destination?.isActive ?? true);
  const errors = state.fieldErrors ?? {};

  // Seed images from the existing destination on edit. `publicId` is a recent BE read field; cast
  // loosely so the form compiles ahead of `/regen-types`, and drop items missing it.
  const initialMedia: MediaInput[] = (destination?.media ?? [])
    .filter((m) => m.role === 'hero' || m.role === 'gallery')
    .map((m) => ({
      publicId: String((m as { publicId?: string }).publicId ?? ''),
      role: m.role as 'hero' | 'gallery',
      width: m.width ?? undefined,
      height: m.height ?? undefined,
      url: m.url,
    }))
    .filter((m) => m.publicId);
  const [media, setMedia] = useState<MediaInput[]>(initialMedia);

  return (
    <form action={formAction} noValidate>
      {/* Destination details */}
      <FieldSet className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div>
          <FieldLegend className="mb-1.5 font-semibold">
            Destination details
          </FieldLegend>
          <FieldDescription>
            The name travellers see, its URL slug, and where it sits.
          </FieldDescription>
        </div>

        <FieldGroup className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:col-span-2">
          <Field
            className="gap-2 sm:col-span-2"
            data-invalid={Boolean(errors.name)}
          >
            <FieldLabel htmlFor="name">Name</FieldLabel>
            <Input
              id="name"
              name="name"
              aria-required="true"
              maxLength={120}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slugEdited) setSlug(slugify(e.target.value));
              }}
              placeholder="Hoi An"
              aria-invalid={Boolean(errors.name)}
            />
            {errors.name ? <FieldError>{errors.name}</FieldError> : null}
          </Field>

          <Field
            className="gap-2 sm:col-span-2"
            data-invalid={Boolean(errors.slug)}
          >
            <FieldLabel htmlFor="slug">Slug</FieldLabel>
            <Input
              id="slug"
              name="slug"
              maxLength={80}
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugEdited(true);
              }}
              placeholder="hoi-an"
              aria-invalid={Boolean(errors.slug)}
            />
            <FieldDescription className="text-xs">
              Auto-generated from the name. Edit it only for a custom URL — keep
              it lowercase with words separated by hyphens.
            </FieldDescription>
            {errors.slug ? <FieldError>{errors.slug}</FieldError> : null}
          </Field>

          <Field className="gap-2">
            <FieldLabel htmlFor="country">Country</FieldLabel>
            <Input
              id="country"
              name="country"
              value="Vietnam"
              readOnly
              tabIndex={-1}
              aria-readonly
              className="bg-muted/50 cursor-default"
            />
            <FieldDescription className="text-xs">
              We only run Vietnam tours for now.
            </FieldDescription>
          </Field>

          <Field className="gap-2" data-invalid={Boolean(errors.region)}>
            <FieldLabel htmlFor="region">Region</FieldLabel>
            <Select value={region} onValueChange={(v) => setRegion(v ?? '')}>
              <SelectTrigger id="region" className="w-full">
                <SelectValue placeholder="Select a region" />
              </SelectTrigger>
              <SelectContent align="start" alignItemWithTrigger={false}>
                {REGION_ORDER.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" name="region" value={region} />
            {errors.region ? <FieldError>{errors.region}</FieldError> : null}
          </Field>
        </FieldGroup>
      </FieldSet>

      <Separator className="my-8" />

      {/* Images */}
      <DestinationMediaField initial={initialMedia} onChange={setMedia} />
      <input type="hidden" name="media" value={JSON.stringify(media)} />

      <Separator className="my-8" />

      {/* Content & visibility */}
      <FieldSet className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div>
          <FieldLegend className="mb-1.5 font-semibold">
            Content &amp; visibility
          </FieldLegend>
          <FieldDescription>
            The public summary, and whether this destination is live on the
            site.
          </FieldDescription>
        </div>

        <FieldGroup className="grid grid-cols-1 gap-6 md:col-span-2">
          <Field className="gap-2" data-invalid={Boolean(errors.description)}>
            <FieldLabel htmlFor="description">Description</FieldLabel>
            <Textarea
              id="description"
              name="description"
              rows={4}
              maxLength={2000}
              defaultValue={destination?.description ?? ''}
              placeholder="A short summary shown on the destination page."
              aria-invalid={Boolean(errors.description)}
            />
            {errors.description ? (
              <FieldError>{errors.description}</FieldError>
            ) : null}
          </Field>

          <Field orientation="horizontal" className="items-center">
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <input
              type="hidden"
              name="isActive"
              value={isActive ? 'true' : 'false'}
            />
            <div>
              <FieldLabel htmlFor="isActive" className="font-normal">
                Active
              </FieldLabel>
              <FieldDescription>
                Inactive destinations are hidden from the public site.
              </FieldDescription>
            </div>
          </Field>
        </FieldGroup>
      </FieldSet>

      {state.error ? (
        <ErrorAlert className="mt-6">{state.error}</ErrorAlert>
      ) : null}

      <Separator className="my-8" />

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          nativeButton={false}
          render={<Link href="/destinations" />}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}

export default DestinationForm;
