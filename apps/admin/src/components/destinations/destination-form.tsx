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

import type { DestinationFormState } from '../../lib/destinations/actions';
import type { Destination } from '../../lib/destinations/data';

interface DestinationFormProps {
  /** Bound server action (create, or update with the slug already applied). */
  action: (prev: DestinationFormState, formData: FormData) => Promise<DestinationFormState>;
  /** Existing record when editing; omitted when creating. */
  destination?: Destination;
  submitLabel: string;
}

/**
 * Create/edit form for a destination — shadcn "Form Layout 2" (sectioned: a left title/description
 * column beside the fields). Submits to a Server Action via `useActionState`. Shared by the create
 * and edit pages; the reusable section shape is the template for other CRUD forms.
 */
export function DestinationForm({ action, destination, submitLabel }: DestinationFormProps) {
  const [state, formAction, pending] = useActionState<DestinationFormState, FormData>(action, {});
  const [isActive, setIsActive] = useState(destination?.isActive ?? true);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction}>
      {/* Destination details */}
      <FieldSet className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div>
          <FieldLegend className="mb-1.5 font-semibold">Destination details</FieldLegend>
          <FieldDescription>
            The name travellers see, its URL slug, and where it sits.
          </FieldDescription>
        </div>

        <FieldGroup className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:col-span-2">
          <Field className="gap-2 sm:col-span-2" data-invalid={Boolean(errors.name)}>
            <FieldLabel htmlFor="name">Name</FieldLabel>
            <Input
              id="name"
              name="name"
              required
              maxLength={120}
              defaultValue={destination?.name ?? ''}
              placeholder="Hoi An"
              aria-invalid={Boolean(errors.name)}
            />
            {errors.name ? <FieldError>{errors.name}</FieldError> : null}
          </Field>

          <Field className="gap-2 sm:col-span-2" data-invalid={Boolean(errors.slug)}>
            <FieldLabel htmlFor="slug">Slug</FieldLabel>
            <Input
              id="slug"
              name="slug"
              maxLength={80}
              defaultValue={destination?.slug ?? ''}
              placeholder="hoi-an"
              aria-invalid={Boolean(errors.slug)}
            />
            <FieldDescription className="text-xs">
              Leave blank to generate one from the name. Lowercase, words separated by hyphens.
            </FieldDescription>
            {errors.slug ? <FieldError>{errors.slug}</FieldError> : null}
          </Field>

          <Field className="gap-2" data-invalid={Boolean(errors.country)}>
            <FieldLabel htmlFor="country">Country</FieldLabel>
            <Input
              id="country"
              name="country"
              maxLength={60}
              defaultValue={destination?.country ?? 'Vietnam'}
              placeholder="Vietnam"
              aria-invalid={Boolean(errors.country)}
            />
            {errors.country ? <FieldError>{errors.country}</FieldError> : null}
          </Field>

          <Field className="gap-2" data-invalid={Boolean(errors.region)}>
            <FieldLabel htmlFor="region">Region</FieldLabel>
            <Input
              id="region"
              name="region"
              maxLength={80}
              defaultValue={destination?.region ?? ''}
              placeholder="Central Vietnam"
              aria-invalid={Boolean(errors.region)}
            />
            {errors.region ? <FieldError>{errors.region}</FieldError> : null}
          </Field>
        </FieldGroup>
      </FieldSet>

      <Separator className="my-8" />

      {/* Content & visibility */}
      <FieldSet className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div>
          <FieldLegend className="mb-1.5 font-semibold">Content &amp; visibility</FieldLegend>
          <FieldDescription>
            The public summary, and whether this destination is live on the site.
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
            {errors.description ? <FieldError>{errors.description}</FieldError> : null}
          </Field>

          <Field orientation="horizontal" className="items-center">
            <Switch id="isActive" checked={isActive} onCheckedChange={setIsActive} />
            <input type="hidden" name="isActive" value={isActive ? 'true' : 'false'} />
            <div>
              <FieldLabel htmlFor="isActive" className="font-normal">
                Active
              </FieldLabel>
              <FieldDescription>Inactive destinations are hidden from the public site.</FieldDescription>
            </div>
          </Field>
        </FieldGroup>
      </FieldSet>

      {state.error ? (
        <p className="text-destructive mt-6 text-sm" role="alert">
          {state.error}
        </p>
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
