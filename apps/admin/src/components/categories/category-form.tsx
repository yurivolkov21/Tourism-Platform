'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';

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
  Separator,
  Switch,
  Textarea,
} from '@tourism/ui';

import type { CategoryFormState } from '../../lib/categories/actions';
import type { Category } from '../../lib/categories/data';
import { slugify } from '../../lib/slugify';
import { ErrorAlert } from '../crud/error-alert';

interface CategoryFormProps {
  /** Bound server action (create, or update with the slug already applied). */
  action: (prev: CategoryFormState, formData: FormData) => Promise<CategoryFormState>;
  /** Existing record when editing; omitted when creating. */
  category?: Category;
  submitLabel: string;
}

/**
 * Create/edit form for a tour category — shadcn "Form Layout 2" (sectioned: a left title/description
 * column beside the fields). Slug auto-derives from the name (until the admin edits it). Mirrors the
 * Destinations form, minus images (categories have none). Shared by create + edit.
 */
export function CategoryForm({ action, category, submitLabel }: CategoryFormProps) {
  const [state, formAction, pending] = useActionState<CategoryFormState, FormData>(action, {});
  const [name, setName] = useState(category?.name ?? '');
  const [slug, setSlug] = useState(category?.slug ?? '');
  // On edit the slug is pre-set → treat as user-owned so editing the name doesn't clobber the URL.
  const [slugEdited, setSlugEdited] = useState(Boolean(category?.slug));
  const [isActive, setIsActive] = useState(category?.isActive ?? true);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction}>
      {/* Category details */}
      <FieldSet className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div>
          <FieldLegend className="mb-1.5 font-semibold">Category details</FieldLegend>
          <FieldDescription>The name travellers see, its URL slug, and where it sorts.</FieldDescription>
        </div>

        <FieldGroup className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:col-span-2">
          <Field className="gap-2 sm:col-span-2" data-invalid={Boolean(errors.name)}>
            <FieldLabel htmlFor="name">Name</FieldLabel>
            <Input
              id="name"
              name="name"
              required
              maxLength={120}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slugEdited) setSlug(slugify(e.target.value));
              }}
              placeholder="Adventure Tours"
              aria-invalid={Boolean(errors.name)}
            />
            {errors.name ? <FieldError>{errors.name}</FieldError> : null}
          </Field>

          <Field className="gap-2" data-invalid={Boolean(errors.slug)}>
            <FieldLabel htmlFor="slug">Slug</FieldLabel>
            <Input
              id="slug"
              name="slug"
              maxLength={60}
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugEdited(true);
              }}
              placeholder="adventure-tours"
              aria-invalid={Boolean(errors.slug)}
            />
            <FieldDescription className="text-xs">
              Auto-generated from the name. Edit it only for a custom URL — keep it lowercase with
              words separated by hyphens.
            </FieldDescription>
            {errors.slug ? <FieldError>{errors.slug}</FieldError> : null}
          </Field>

          <Field className="gap-2" data-invalid={Boolean(errors.order)}>
            <FieldLabel htmlFor="order">Display order</FieldLabel>
            <Input
              id="order"
              name="order"
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              defaultValue={category?.order ?? 0}
              className="max-w-32"
              aria-invalid={Boolean(errors.order)}
            />
            <FieldDescription className="text-xs">Lower numbers appear first. Defaults to 0.</FieldDescription>
            {errors.order ? <FieldError>{errors.order}</FieldError> : null}
          </Field>
        </FieldGroup>
      </FieldSet>

      <Separator className="my-8" />

      {/* Content & visibility */}
      <FieldSet className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div>
          <FieldLegend className="mb-1.5 font-semibold">Content &amp; visibility</FieldLegend>
          <FieldDescription>
            The public summary, and whether this category is live on the site.
          </FieldDescription>
        </div>

        <FieldGroup className="grid grid-cols-1 gap-6 md:col-span-2">
          <Field className="gap-2" data-invalid={Boolean(errors.description)}>
            <FieldLabel htmlFor="description">Description</FieldLabel>
            <Textarea
              id="description"
              name="description"
              rows={3}
              maxLength={500}
              defaultValue={category?.description ?? ''}
              placeholder="A short summary of what this category groups."
              aria-invalid={Boolean(errors.description)}
            />
            {errors.description ? <FieldError>{errors.description}</FieldError> : null}
          </Field>

          <Field orientation="horizontal" className="items-center">
            <Switch id="isActive" checked={isActive} onCheckedChange={setIsActive} />
            <input type="hidden" name="isActive" value={isActive ? 'true' : 'false'} />
            <div>
              <FieldLabel htmlFor="isActive" className="font-normal">
                Active
              </FieldLabel>
              <FieldDescription>Inactive categories are hidden from the public site.</FieldDescription>
            </div>
          </Field>
        </FieldGroup>
      </FieldSet>

      {state.error ? <ErrorAlert className="mt-6">{state.error}</ErrorAlert> : null}

      <Separator className="my-8" />

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" nativeButton={false} render={<Link href="/categories" />}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}

export default CategoryForm;
