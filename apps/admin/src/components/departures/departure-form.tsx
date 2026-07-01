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
  Input,
} from '@tourism/ui';

import type { DepartureFormState } from '../../lib/departures/actions';
import { DEPARTURE_STATUSES } from '../../lib/departures/schema';
import type { Departure } from '../../lib/departures/data';
import { toDateOnly } from '../../lib/departures/format';
import { ErrorAlert } from '../crud/error-alert';

interface DepartureFormProps {
  /** Bound server action (create with slug, or update with slug + id). */
  action: (prev: DepartureFormState, formData: FormData) => Promise<DepartureFormState>;
  /** Existing row when editing; omitted when creating. */
  departure?: Departure;
  /** Tour slug for the Cancel link. */
  slug: string;
  submitLabel: string;
}

const SELECT_CLASS =
  'border-input bg-background h-9 w-full max-w-xs rounded-lg border px-2.5 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50';

const labelize = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

export function DepartureForm({ action, departure, slug, submitLabel }: DepartureFormProps) {
  const [state, formAction, pending] = useActionState<DepartureFormState, FormData>(action, {});
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6">
      <FieldGroup>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field data-invalid={Boolean(errors.startDate)}>
            <FieldLabel htmlFor="startDate">Start date</FieldLabel>
            <Input id="startDate" name="startDate" type="date" required defaultValue={departure ? toDateOnly(departure.startDate) : ''} aria-invalid={Boolean(errors.startDate)} />
            {errors.startDate ? <FieldError>{errors.startDate}</FieldError> : null}
          </Field>
          <Field data-invalid={Boolean(errors.endDate)}>
            <FieldLabel htmlFor="endDate">End date</FieldLabel>
            <Input id="endDate" name="endDate" type="date" required defaultValue={departure ? toDateOnly(departure.endDate) : ''} aria-invalid={Boolean(errors.endDate)} />
            {errors.endDate ? <FieldError>{errors.endDate}</FieldError> : null}
          </Field>
        </div>

        <Field data-invalid={Boolean(errors.seatsTotal)}>
          <FieldLabel htmlFor="seatsTotal">Total seats</FieldLabel>
          <Input id="seatsTotal" name="seatsTotal" type="number" min={1} max={1000} step={1} inputMode="numeric" required defaultValue={departure?.seatsTotal ?? ''} placeholder="15" className="max-w-32" aria-invalid={Boolean(errors.seatsTotal)} />
          {departure ? (
            <FieldDescription>
              {departure.seatsBooked} booked — can&apos;t set below that.
            </FieldDescription>
          ) : null}
          {errors.seatsTotal ? <FieldError>{errors.seatsTotal}</FieldError> : null}
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field data-invalid={Boolean(errors.priceOverride)}>
            <FieldLabel htmlFor="priceOverride">Price override</FieldLabel>
            <Input id="priceOverride" name="priceOverride" type="number" min={0} step="0.01" inputMode="decimal" defaultValue={departure?.priceOverride ?? ''} placeholder="Leave blank = tour base price" aria-invalid={Boolean(errors.priceOverride)} />
            {errors.priceOverride ? <FieldError>{errors.priceOverride}</FieldError> : null}
          </Field>
          <Field data-invalid={Boolean(errors.compareAtPrice)}>
            <FieldLabel htmlFor="compareAtPrice">Compare-at price</FieldLabel>
            <Input id="compareAtPrice" name="compareAtPrice" type="number" min={0} step="0.01" inputMode="decimal" defaultValue={departure?.compareAtPrice ?? ''} placeholder="69.00" aria-invalid={Boolean(errors.compareAtPrice)} />
            {errors.compareAtPrice ? <FieldError>{errors.compareAtPrice}</FieldError> : null}
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="status">Status</FieldLabel>
          <select id="status" name="status" defaultValue={departure?.status ?? 'OPEN'} className={SELECT_CLASS}>
            {DEPARTURE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {labelize(s)}
              </option>
            ))}
          </select>
        </Field>
      </FieldGroup>

      {state.error ? <ErrorAlert>{state.error}</ErrorAlert> : null}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : submitLabel}
        </Button>
        <Button type="button" variant="ghost" nativeButton={false} render={<Link href={`/tours/${slug}/departures`} />}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default DepartureForm;
