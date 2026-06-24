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
  Input,
  Switch,
  Textarea,
} from '@tourism/ui';

import type { CategoryFormState } from '../../lib/categories/actions';
import type { Category } from '../../lib/categories/data';

interface CategoryFormProps {
  /** Bound server action (create, or update with the slug already applied). */
  action: (prev: CategoryFormState, formData: FormData) => Promise<CategoryFormState>;
  /** Existing record when editing; omitted when creating. */
  category?: Category;
  submitLabel: string;
}

/** Create/edit form for a tour category. Submits to a Server Action via `useActionState`. */
export function CategoryForm({ action, category, submitLabel }: CategoryFormProps) {
  const [state, formAction, pending] = useActionState<CategoryFormState, FormData>(action, {});
  const [isActive, setIsActive] = useState(category?.isActive ?? true);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6">
      <FieldGroup>
        <Field data-invalid={Boolean(errors.name)}>
          <FieldLabel htmlFor="name">Name</FieldLabel>
          <Input
            id="name"
            name="name"
            required
            maxLength={120}
            defaultValue={category?.name ?? ''}
            placeholder="Adventure Tours"
            aria-invalid={Boolean(errors.name)}
          />
          {errors.name ? <FieldError>{errors.name}</FieldError> : null}
        </Field>

        <Field data-invalid={Boolean(errors.slug)}>
          <FieldLabel htmlFor="slug">Slug</FieldLabel>
          <Input
            id="slug"
            name="slug"
            maxLength={60}
            defaultValue={category?.slug ?? ''}
            placeholder="adventure-tours"
            aria-invalid={Boolean(errors.slug)}
          />
          <FieldDescription>
            Leave blank to generate one from the name. Lowercase, words separated by hyphens.
          </FieldDescription>
          {errors.slug ? <FieldError>{errors.slug}</FieldError> : null}
        </Field>

        <Field data-invalid={Boolean(errors.description)}>
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

        <Field data-invalid={Boolean(errors.order)}>
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
          <FieldDescription>Lower numbers appear first. Defaults to 0.</FieldDescription>
          {errors.order ? <FieldError>{errors.order}</FieldError> : null}
        </Field>

        <Field orientation="horizontal">
          <Switch id="isActive" checked={isActive} onCheckedChange={setIsActive} />
          <input type="hidden" name="isActive" value={isActive ? 'true' : 'false'} />
          <FieldLabel htmlFor="isActive" className="font-normal">
            Active
          </FieldLabel>
          <FieldDescription>Inactive categories are hidden from the public site.</FieldDescription>
        </Field>
      </FieldGroup>

      {state.error ? (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : submitLabel}
        </Button>
        <Button type="button" variant="ghost" nativeButton={false} render={<Link href="/categories" />}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default CategoryForm;
