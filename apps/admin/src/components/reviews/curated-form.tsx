'use client';

import Link from 'next/link';
import { useActionState } from 'react';

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
  Textarea,
} from '@tourism/ui';

import {
  createCurated,
  type CuratedFormState,
} from '../../lib/reviews/actions';
import { ErrorAlert } from '../crud/error-alert';

const INITIAL: CuratedFormState = {};

/**
 * Create-curated-testimonial form — shadcn "Form Layout 2" (sectioned), matching the other admin
 * forms. The API stores it approved + featured (it's for the homepage). Field names unchanged.
 */
export function CuratedForm() {
  const [state, action, pending] = useActionState(createCurated, INITIAL);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action}>
      {/* Traveller */}
      <FieldSet className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div>
          <FieldLegend className="mb-1.5 font-semibold">Traveller</FieldLegend>
          <FieldDescription>
            Who the testimonial is from and the trip it refers to.
          </FieldDescription>
        </div>
        <FieldGroup className="grid grid-cols-1 gap-6 md:col-span-2">
          <Field data-invalid={Boolean(errors.authorName)}>
            <FieldLabel htmlFor="authorName">Traveller name</FieldLabel>
            <Input
              id="authorName"
              name="authorName"
              required
              placeholder="Emily Carter"
              aria-invalid={Boolean(errors.authorName)}
            />
            {errors.authorName ? (
              <FieldError>{errors.authorName}</FieldError>
            ) : null}
          </Field>
          <div className="grid gap-6 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="authorLocation">Location</FieldLabel>
              <Input
                id="authorLocation"
                name="authorLocation"
                placeholder="Sydney, Australia"
              />
              <FieldDescription>Optional.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="tripLabel">Trip</FieldLabel>
              <Input
                id="tripLabel"
                name="tripLabel"
                placeholder="Hạ Long Bay Cruise"
              />
              <FieldDescription>
                Optional — shown under the name.
              </FieldDescription>
            </Field>
          </div>
        </FieldGroup>
      </FieldSet>

      <Separator className="my-8" />

      {/* Testimonial */}
      <FieldSet className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div>
          <FieldLegend className="mb-1.5 font-semibold">
            Testimonial
          </FieldLegend>
          <FieldDescription>
            Published approved + featured on the homepage carousel.
          </FieldDescription>
        </div>
        <FieldGroup className="grid grid-cols-1 gap-6 md:col-span-2">
          <Field data-invalid={Boolean(errors.rating)}>
            <FieldLabel htmlFor="rating">Rating</FieldLabel>
            <Input
              id="rating"
              name="rating"
              type="number"
              min={1}
              max={5}
              defaultValue={5}
              className="w-24"
              aria-invalid={Boolean(errors.rating)}
            />
            <FieldDescription>1–5 stars.</FieldDescription>
            {errors.rating ? <FieldError>{errors.rating}</FieldError> : null}
          </Field>
          <Field data-invalid={Boolean(errors.body)}>
            <FieldLabel htmlFor="body">Testimonial</FieldLabel>
            <Textarea
              id="body"
              name="body"
              rows={4}
              required
              placeholder="What made the trip memorable…"
              aria-invalid={Boolean(errors.body)}
            />
            {errors.body ? <FieldError>{errors.body}</FieldError> : null}
          </Field>
        </FieldGroup>
      </FieldSet>

      {state.error ? (
        <div className="mt-6">
          <ErrorAlert>{state.error}</ErrorAlert>
        </div>
      ) : null}

      <div className="mt-8 flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          nativeButton={false}
          render={<Link href="/reviews" />}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Create testimonial'}
        </Button>
      </div>
    </form>
  );
}

export default CuratedForm;
