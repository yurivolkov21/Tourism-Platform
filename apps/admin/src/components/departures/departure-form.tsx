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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
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

const labelize = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

/**
 * Create/edit form for a departure — shadcn "Form Layout 2" (sectioned: a left title/description
 * column beside the fields), matching the destination/tour forms. Status uses the `@tourism/ui` Select
 * (controlled + a hidden input to post the value), never a native `<select>`. Shared by create + edit;
 * field names / schema / server actions are unchanged.
 */
export function DepartureForm({ action, departure, slug, submitLabel }: DepartureFormProps) {
  const [state, formAction, pending] = useActionState<DepartureFormState, FormData>(action, {});
  const [status, setStatus] = useState<string>(departure?.status ?? 'OPEN');
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction}>
      {/* Schedule & capacity */}
      <FieldSet className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div>
          <FieldLegend className="mb-1.5 font-semibold">Schedule &amp; capacity</FieldLegend>
          <FieldDescription>
            When this departure runs and how many seats it holds.
          </FieldDescription>
        </div>

        <FieldGroup className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:col-span-2">
          <Field className="gap-2" data-invalid={Boolean(errors.startDate)}>
            <FieldLabel htmlFor="startDate">Start date</FieldLabel>
            <Input
              id="startDate"
              name="startDate"
              type="date"
              required
              defaultValue={departure ? toDateOnly(departure.startDate) : ''}
              aria-invalid={Boolean(errors.startDate)}
            />
            {errors.startDate ? <FieldError>{errors.startDate}</FieldError> : null}
          </Field>

          <Field className="gap-2" data-invalid={Boolean(errors.endDate)}>
            <FieldLabel htmlFor="endDate">End date</FieldLabel>
            <Input
              id="endDate"
              name="endDate"
              type="date"
              required
              defaultValue={departure ? toDateOnly(departure.endDate) : ''}
              aria-invalid={Boolean(errors.endDate)}
            />
            {errors.endDate ? <FieldError>{errors.endDate}</FieldError> : null}
          </Field>

          <Field className="gap-2 sm:col-span-2" data-invalid={Boolean(errors.seatsTotal)}>
            <FieldLabel htmlFor="seatsTotal">Total seats</FieldLabel>
            <Input
              id="seatsTotal"
              name="seatsTotal"
              type="number"
              min={1}
              max={1000}
              step={1}
              inputMode="numeric"
              required
              defaultValue={departure?.seatsTotal ?? ''}
              placeholder="15"
              className="max-w-32"
              aria-invalid={Boolean(errors.seatsTotal)}
            />
            {departure ? (
              <FieldDescription>
                {departure.seatsBooked} booked — can&apos;t set below that.
              </FieldDescription>
            ) : null}
            {errors.seatsTotal ? <FieldError>{errors.seatsTotal}</FieldError> : null}
          </Field>
        </FieldGroup>
      </FieldSet>

      <Separator className="my-8" />

      {/* Pricing & visibility */}
      <FieldSet className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div>
          <FieldLegend className="mb-1.5 font-semibold">Pricing &amp; visibility</FieldLegend>
          <FieldDescription>
            Optional per-departure price anchors, and whether it&apos;s open for booking.
          </FieldDescription>
        </div>

        <FieldGroup className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:col-span-2">
          <Field className="gap-2" data-invalid={Boolean(errors.priceOverride)}>
            <FieldLabel htmlFor="priceOverride">Price override</FieldLabel>
            <Input
              id="priceOverride"
              name="priceOverride"
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              defaultValue={departure?.priceOverride ?? ''}
              placeholder="Leave blank = tour base price"
              aria-invalid={Boolean(errors.priceOverride)}
            />
            <FieldDescription className="text-xs">
              Leave blank to use the tour&apos;s base price.
            </FieldDescription>
            {errors.priceOverride ? <FieldError>{errors.priceOverride}</FieldError> : null}
          </Field>

          <Field className="gap-2" data-invalid={Boolean(errors.compareAtPrice)}>
            <FieldLabel htmlFor="compareAtPrice">Compare-at price</FieldLabel>
            <Input
              id="compareAtPrice"
              name="compareAtPrice"
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              defaultValue={departure?.compareAtPrice ?? ''}
              placeholder="69.00"
              aria-invalid={Boolean(errors.compareAtPrice)}
            />
            <FieldDescription className="text-xs">
              Shown struck-through next to the price.
            </FieldDescription>
            {errors.compareAtPrice ? <FieldError>{errors.compareAtPrice}</FieldError> : null}
          </Field>

          <Field className="gap-2 sm:col-span-2">
            <FieldLabel htmlFor="status">Status</FieldLabel>
            <Select value={status} onValueChange={(v) => setStatus(v ?? 'OPEN')}>
              <SelectTrigger id="status" className="w-full max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start" alignItemWithTrigger={false}>
                {DEPARTURE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {labelize(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" name="status" value={status} />
            <FieldDescription className="text-xs">
              Only <strong>Open</strong> departures can be booked. Past dates can&apos;t be booked
              regardless of status.
            </FieldDescription>
          </Field>
        </FieldGroup>
      </FieldSet>

      {state.error ? <ErrorAlert className="mt-6">{state.error}</ErrorAlert> : null}

      <Separator className="my-8" />

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          nativeButton={false}
          render={<Link href={`/tours/${slug}/departures`} />}
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

export default DepartureForm;
