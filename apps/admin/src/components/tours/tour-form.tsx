'use client';

import Link from 'next/link';
import { useActionState, useEffect, useState } from 'react';

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

import type { TourFormState } from '../../lib/tours/actions';
import { TOUR_BADGES, TRAVELLER_TYPES } from '../../lib/tours/schema';
import type { TourDetail } from '../../lib/tours/data';
import { ChipInput } from './chip-input';
import { DestinationPicker, type DestinationOption } from './destination-picker';

interface TourFormProps {
  action: (prev: TourFormState, formData: FormData) => Promise<TourFormState>;
  categories: DestinationOption[];
  destinations: DestinationOption[];
  tour?: TourDetail;
  submitLabel: string;
}

const SELECT_CLASS =
  'border-input bg-background h-9 w-full max-w-sm rounded-lg border px-2.5 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50';

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-muted-foreground border-b pb-1.5 text-xs font-semibold tracking-wide uppercase">
    {children}
  </h2>
);

/** Title-cases an enum constant: `BEST_VALUE` → `Best value`. */
const labelize = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, ' ');

export function TourForm({ action, categories, destinations, tour, submitLabel }: TourFormProps) {
  const [state, formAction, pending] = useActionState<TourFormState, FormData>(action, {});
  const errors = state.fieldErrors ?? {};

  const initialDests = tour?.destinations.map((d) => d.destination.slug) ?? [];
  const initialPrimary =
    tour?.destinations.find((d) => d.isPrimary)?.destination.slug ?? initialDests[0] ?? '';

  const [destSlugs, setDestSlugs] = useState<string[]>(initialDests);
  const [primary, setPrimary] = useState<string>(initialPrimary);
  const [isPublished, setIsPublished] = useState(tour?.isPublished ?? false);
  const [isFeatured, setIsFeatured] = useState(tour?.isFeatured ?? false);

  // Keep the primary destination valid: default to / reset within the chosen set.
  useEffect(() => {
    if (destSlugs.length === 0) {
      if (primary !== '') setPrimary('');
    } else if (!destSlugs.includes(primary)) {
      setPrimary(destSlugs[0]);
    }
  }, [destSlugs, primary]);

  const primaryOptions = destinations.filter((d) => destSlugs.includes(d.slug));

  return (
    <form action={formAction} className="space-y-8">
      {/* Identity */}
      <section className="space-y-4">
        <SectionTitle>Identity</SectionTitle>
        <FieldGroup>
          <Field data-invalid={Boolean(errors.title)}>
            <FieldLabel htmlFor="title">Title</FieldLabel>
            <Input id="title" name="title" required maxLength={200} defaultValue={tour?.title ?? ''} placeholder="Hoi An Ancient Town Walking Tour" aria-invalid={Boolean(errors.title)} />
            {errors.title ? <FieldError>{errors.title}</FieldError> : null}
          </Field>
          <Field data-invalid={Boolean(errors.slug)}>
            <FieldLabel htmlFor="slug">Slug</FieldLabel>
            <Input id="slug" name="slug" maxLength={200} defaultValue={tour?.slug ?? ''} placeholder="hoi-an-walking-tour" aria-invalid={Boolean(errors.slug)} />
            <FieldDescription>Leave blank to generate one from the title.</FieldDescription>
            {errors.slug ? <FieldError>{errors.slug}</FieldError> : null}
          </Field>
          <Field data-invalid={Boolean(errors.summary)}>
            <FieldLabel htmlFor="summary">Summary</FieldLabel>
            <Textarea id="summary" name="summary" rows={2} maxLength={500} defaultValue={tour?.summary ?? ''} placeholder="A short one-liner shown on the tour card." aria-invalid={Boolean(errors.summary)} />
            {errors.summary ? <FieldError>{errors.summary}</FieldError> : null}
          </Field>
        </FieldGroup>
      </section>

      {/* References */}
      <section className="space-y-4">
        <SectionTitle>Category &amp; destinations</SectionTitle>
        <FieldGroup>
          <Field data-invalid={Boolean(errors.categorySlug)}>
            <FieldLabel htmlFor="categorySlug">Category</FieldLabel>
            <select id="categorySlug" name="categorySlug" defaultValue={tour?.category.slug ?? ''} className={SELECT_CLASS} aria-invalid={Boolean(errors.categorySlug)}>
              <option value="" disabled>
                Select a category…
              </option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.categorySlug ? <FieldError>{errors.categorySlug}</FieldError> : null}
          </Field>

          <Field data-invalid={Boolean(errors.destinationSlugs)}>
            <FieldLabel>Destinations</FieldLabel>
            <DestinationPicker options={destinations} value={destSlugs} onChange={setDestSlugs} />
            <FieldDescription>Pick at least one. The primary is set below.</FieldDescription>
            {errors.destinationSlugs ? <FieldError>{errors.destinationSlugs}</FieldError> : null}
          </Field>

          <Field data-invalid={Boolean(errors.primaryDestinationSlug)}>
            <FieldLabel htmlFor="primaryDestinationSlug">Primary destination</FieldLabel>
            <select id="primaryDestinationSlug" name="primaryDestinationSlug" value={primary} onChange={(e) => setPrimary(e.target.value)} className={SELECT_CLASS} disabled={primaryOptions.length === 0} aria-invalid={Boolean(errors.primaryDestinationSlug)}>
              <option value="" disabled>
                {primaryOptions.length === 0 ? 'Pick destinations first' : 'Select primary…'}
              </option>
              {primaryOptions.map((d) => (
                <option key={d.slug} value={d.slug}>
                  {d.name}
                </option>
              ))}
            </select>
            {errors.primaryDestinationSlug ? <FieldError>{errors.primaryDestinationSlug}</FieldError> : null}
          </Field>
        </FieldGroup>
      </section>

      {/* Logistics */}
      <section className="space-y-4">
        <SectionTitle>Logistics</SectionTitle>
        <FieldGroup>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field data-invalid={Boolean(errors.durationDays)}>
              <FieldLabel htmlFor="durationDays">Duration (days)</FieldLabel>
              <Input id="durationDays" name="durationDays" type="number" min={1} max={60} step={1} inputMode="numeric" defaultValue={tour?.durationDays ?? 1} aria-invalid={Boolean(errors.durationDays)} />
              {errors.durationDays ? <FieldError>{errors.durationDays}</FieldError> : null}
            </Field>
            <Field data-invalid={Boolean(errors.maxGroupSize)}>
              <FieldLabel htmlFor="maxGroupSize">Max group size</FieldLabel>
              <Input id="maxGroupSize" name="maxGroupSize" type="number" min={1} max={100} step={1} inputMode="numeric" defaultValue={tour?.maxGroupSize ?? ''} placeholder="20" aria-invalid={Boolean(errors.maxGroupSize)} />
              {errors.maxGroupSize ? <FieldError>{errors.maxGroupSize}</FieldError> : null}
            </Field>
          </div>
          <Field data-invalid={Boolean(errors.meetingPoint)}>
            <FieldLabel htmlFor="meetingPoint">Meeting point</FieldLabel>
            <Input id="meetingPoint" name="meetingPoint" maxLength={300} defaultValue={tour?.meetingPoint ?? ''} placeholder="Hoi An tourist info centre, 78 Le Loi street" aria-invalid={Boolean(errors.meetingPoint)} />
            {errors.meetingPoint ? <FieldError>{errors.meetingPoint}</FieldError> : null}
          </Field>
        </FieldGroup>
      </section>

      {/* Pricing */}
      <section className="space-y-4">
        <SectionTitle>Pricing</SectionTitle>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field data-invalid={Boolean(errors.basePrice)}>
            <FieldLabel htmlFor="basePrice">Base price</FieldLabel>
            <Input id="basePrice" name="basePrice" type="number" min={0} step="0.01" inputMode="decimal" defaultValue={tour?.basePrice ?? ''} placeholder="49.50" aria-invalid={Boolean(errors.basePrice)} />
            {errors.basePrice ? <FieldError>{errors.basePrice}</FieldError> : null}
          </Field>
          <Field data-invalid={Boolean(errors.compareAtPrice)}>
            <FieldLabel htmlFor="compareAtPrice">Compare-at price</FieldLabel>
            <Input id="compareAtPrice" name="compareAtPrice" type="number" min={0} step="0.01" inputMode="decimal" defaultValue={tour?.compareAtPrice ?? ''} placeholder="69.00" aria-invalid={Boolean(errors.compareAtPrice)} />
            {errors.compareAtPrice ? <FieldError>{errors.compareAtPrice}</FieldError> : null}
          </Field>
          <Field data-invalid={Boolean(errors.currency)}>
            <FieldLabel htmlFor="currency">Currency</FieldLabel>
            <Input id="currency" name="currency" maxLength={3} defaultValue={tour?.currency ?? 'USD'} placeholder="USD" className="uppercase" aria-invalid={Boolean(errors.currency)} />
            {errors.currency ? <FieldError>{errors.currency}</FieldError> : null}
          </Field>
        </div>
      </section>

      {/* Classification */}
      <section className="space-y-4">
        <SectionTitle>Classification</SectionTitle>
        <FieldGroup>
          <Field data-invalid={Boolean(errors.difficulty)}>
            <FieldLabel htmlFor="difficulty">Difficulty</FieldLabel>
            <Input id="difficulty" name="difficulty" maxLength={30} defaultValue={tour?.difficulty ?? ''} placeholder="easy" className="max-w-sm" aria-invalid={Boolean(errors.difficulty)} />
            {errors.difficulty ? <FieldError>{errors.difficulty}</FieldError> : null}
          </Field>
          <Field orientation="horizontal">
            <Switch id="isPublished" checked={isPublished} onCheckedChange={setIsPublished} />
            <input type="hidden" name="isPublished" value={isPublished ? 'true' : 'false'} />
            <FieldLabel htmlFor="isPublished" className="font-normal">
              Published
            </FieldLabel>
            <FieldDescription>Unpublished tours are hidden from the public site.</FieldDescription>
          </Field>
          <Field orientation="horizontal">
            <Switch id="isFeatured" checked={isFeatured} onCheckedChange={setIsFeatured} />
            <input type="hidden" name="isFeatured" value={isFeatured ? 'true' : 'false'} />
            <FieldLabel htmlFor="isFeatured" className="font-normal">
              Featured
            </FieldLabel>
            <FieldDescription>Featured tours surface on the home-page shelf.</FieldDescription>
          </Field>
        </FieldGroup>
      </section>

      {/* Merchandising */}
      <section className="space-y-4">
        <SectionTitle>Merchandising</SectionTitle>
        <FieldGroup>
          <Field>
            <FieldLabel>Suitable for</FieldLabel>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {TRAVELLER_TYPES.map((t) => (
                <label key={t} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="suitableFor" value={t} className="accent-primary size-4" />
                  {labelize(t)}
                </label>
              ))}
            </div>
          </Field>
          <Field>
            <FieldLabel>Badges</FieldLabel>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {TOUR_BADGES.map((b) => (
                <label key={b} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="badges" value={b} className="accent-primary size-4" />
                  {labelize(b)}
                </label>
              ))}
            </div>
          </Field>
          {tour ? (
            <FieldDescription>
              These aren&apos;t returned by the API yet, so they show empty when editing. Check any to
              replace the current set; leave all unchecked to keep it unchanged.
            </FieldDescription>
          ) : null}
        </FieldGroup>
      </section>

      {/* Content */}
      <section className="space-y-4">
        <SectionTitle>Content</SectionTitle>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="highlights">Highlights</FieldLabel>
            <ChipInput id="highlights" name="highlights" defaultValue={tour?.highlights ?? []} placeholder="Type a highlight and press Enter" />
          </Field>
          <Field>
            <FieldLabel htmlFor="included">What&apos;s included</FieldLabel>
            <ChipInput id="included" name="included" defaultValue={tour?.included ?? []} placeholder="Type an item and press Enter" />
          </Field>
          <Field>
            <FieldLabel htmlFor="excluded">What&apos;s excluded</FieldLabel>
            <ChipInput id="excluded" name="excluded" defaultValue={tour?.excluded ?? []} placeholder="Type an item and press Enter" />
          </Field>
        </FieldGroup>
      </section>

      {state.error ? (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : submitLabel}
        </Button>
        <Button type="button" variant="ghost" nativeButton={false} render={<Link href="/tours" />}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default TourForm;
