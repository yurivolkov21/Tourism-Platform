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

import type { TourFormState } from '../../lib/tours/actions';
import {
  POLICY_KINDS,
  TOUR_BADGES,
  TRAVELLER_TYPES,
} from '../../lib/tours/schema';
import type { TourDetail } from '../../lib/tours/data';
import { slugify } from '../../lib/slugify';
import {
  DestinationPicker,
  type DestinationOption,
} from './destination-picker';
import { ErrorAlert } from '../crud/error-alert';
import { MediaField } from '../crud/media-field';
import { RepeatableCards } from '../crud/repeatable-cards';
import type { MediaInput } from '../../lib/media';

interface TourFormProps {
  action: (prev: TourFormState, formData: FormData) => Promise<TourFormState>;
  categories: DestinationOption[];
  destinations: DestinationOption[];
  tour?: TourDetail;
  submitLabel: string;
}

/** Title-cases an enum constant: `BEST_VALUE` → `Best value`. */
const labelize = (s: string) =>
  s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, ' ');

/**
 * Create/edit form for a tour — shadcn "Form Layout 2" (sectioned: a left title/description column
 * beside the fields), matching the Destinations form. Object arrays (media now; itinerary/FAQs/
 * policies in a later slice) serialise to hidden JSON inputs. Shared by create + edit.
 */
export function TourForm({
  action,
  categories,
  destinations,
  tour,
  submitLabel,
}: TourFormProps) {
  const [state, formAction, pending] = useActionState<TourFormState, FormData>(
    action,
    {},
  );
  const errors = state.fieldErrors ?? {};

  const initialDests = tour?.destinations.map((d) => d.destination.slug) ?? [];
  const initialPrimary =
    tour?.destinations.find((d) => d.isPrimary)?.destination.slug ??
    initialDests[0] ??
    '';

  const [title, setTitle] = useState(tour?.title ?? '');
  const [slug, setSlug] = useState(tour?.slug ?? '');
  // On edit the slug is pre-set → treat as user-owned so editing the title doesn't clobber the URL.
  const [slugEdited, setSlugEdited] = useState(Boolean(tour?.slug));
  const [category, setCategory] = useState<string>(tour?.category.slug ?? '');
  const [destSlugs, setDestSlugs] = useState<string[]>(initialDests);
  const [primary, setPrimary] = useState<string>(initialPrimary);
  const [isPublished, setIsPublished] = useState(tour?.isPublished ?? false);
  const [isFeatured, setIsFeatured] = useState(tour?.isFeatured ?? false);

  // Seed images from the existing tour on edit (hero + gallery).
  const initialMedia: MediaInput[] = (tour?.media ?? [])
    .filter((m) => m.role === 'hero' || m.role === 'gallery')
    .map((m) => ({
      publicId: m.publicId,
      role: m.role as 'hero' | 'gallery',
      width: m.width ?? undefined,
      height: m.height ?? undefined,
      url: m.url,
    }))
    .filter((m) => m.publicId);
  const [media, setMedia] = useState<MediaInput[]>(initialMedia);

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
    <form action={formAction} noValidate>
      {/* Tour details */}
      <FieldSet className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div>
          <FieldLegend className="mb-1.5 font-semibold">
            Tour details
          </FieldLegend>
          <FieldDescription>
            The public title, its URL slug, and the card summary.
          </FieldDescription>
        </div>
        <FieldGroup className="grid grid-cols-1 gap-6 md:col-span-2">
          <Field data-invalid={Boolean(errors.title)}>
            <FieldLabel htmlFor="title">Title</FieldLabel>
            <Input
              id="title"
              name="title"
              aria-required="true"
              maxLength={200}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (!slugEdited) setSlug(slugify(e.target.value));
              }}
              placeholder="Hoi An Ancient Town Walking Tour"
              aria-invalid={Boolean(errors.title)}
            />
            {errors.title ? <FieldError>{errors.title}</FieldError> : null}
          </Field>
          <Field data-invalid={Boolean(errors.slug)}>
            <FieldLabel htmlFor="slug">Slug</FieldLabel>
            <Input
              id="slug"
              name="slug"
              maxLength={200}
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugEdited(true);
              }}
              placeholder="hoi-an-walking-tour"
              aria-invalid={Boolean(errors.slug)}
            />
            <FieldDescription>
              Auto-generated from the title. Edit it only for a custom URL —
              lowercase, words separated by hyphens.
            </FieldDescription>
            {errors.slug ? <FieldError>{errors.slug}</FieldError> : null}
          </Field>
          <Field data-invalid={Boolean(errors.summary)}>
            <FieldLabel htmlFor="summary">Summary</FieldLabel>
            <Textarea
              id="summary"
              name="summary"
              rows={2}
              maxLength={500}
              defaultValue={tour?.summary ?? ''}
              placeholder="A short one-liner shown on the tour card."
              aria-invalid={Boolean(errors.summary)}
            />
            {errors.summary ? <FieldError>{errors.summary}</FieldError> : null}
          </Field>
        </FieldGroup>
      </FieldSet>

      <Separator className="my-8" />

      {/* Category & destinations */}
      <FieldSet className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div>
          <FieldLegend className="mb-1.5 font-semibold">
            Category &amp; destinations
          </FieldLegend>
          <FieldDescription>
            Where the tour is grouped and the places it visits.
          </FieldDescription>
        </div>
        <FieldGroup className="grid grid-cols-1 gap-6 md:col-span-2">
          <Field data-invalid={Boolean(errors.categorySlug)}>
            <FieldLabel htmlFor="categorySlug">Category</FieldLabel>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v ?? '')}
            >
              <SelectTrigger
                id="categorySlug"
                className="w-full"
                aria-required="true"
                aria-invalid={Boolean(errors.categorySlug)}
              >
                <SelectValue placeholder="Select a category…" />
              </SelectTrigger>
              <SelectContent align="start" alignItemWithTrigger={false}>
                {categories.map((c) => (
                  <SelectItem key={c.slug} value={c.slug}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" name="categorySlug" value={category} />
            {errors.categorySlug ? (
              <FieldError>{errors.categorySlug}</FieldError>
            ) : null}
          </Field>

          <Field data-invalid={Boolean(errors.destinationSlugs)}>
            <FieldLabel>Destinations</FieldLabel>
            <DestinationPicker
              options={destinations}
              value={destSlugs}
              onChange={setDestSlugs}
            />
            <FieldDescription>
              Pick at least one. The primary is set below.
            </FieldDescription>
            {errors.destinationSlugs ? (
              <FieldError>{errors.destinationSlugs}</FieldError>
            ) : null}
          </Field>

          <Field data-invalid={Boolean(errors.primaryDestinationSlug)}>
            <FieldLabel htmlFor="primaryDestinationSlug">
              Primary destination
            </FieldLabel>
            <Select
              value={primary}
              onValueChange={(v) => setPrimary(v ?? '')}
              disabled={primaryOptions.length === 0}
            >
              <SelectTrigger
                id="primaryDestinationSlug"
                className="w-full"
                aria-required="true"
                aria-invalid={Boolean(errors.primaryDestinationSlug)}
              >
                <SelectValue
                  placeholder={
                    primaryOptions.length === 0
                      ? 'Pick destinations first'
                      : 'Select primary…'
                  }
                />
              </SelectTrigger>
              <SelectContent align="start" alignItemWithTrigger={false}>
                {primaryOptions.map((d) => (
                  <SelectItem key={d.slug} value={d.slug}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input
              type="hidden"
              name="primaryDestinationSlug"
              value={primary}
            />
            {errors.primaryDestinationSlug ? (
              <FieldError>{errors.primaryDestinationSlug}</FieldError>
            ) : null}
          </Field>
        </FieldGroup>
      </FieldSet>

      <Separator className="my-8" />

      {/* Logistics */}
      <FieldSet className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div>
          <FieldLegend className="mb-1.5 font-semibold">Logistics</FieldLegend>
          <FieldDescription>
            Duration, group size, and where travellers meet.
          </FieldDescription>
        </div>
        <FieldGroup className="grid grid-cols-1 gap-6 md:col-span-2">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Field data-invalid={Boolean(errors.durationDays)}>
              <FieldLabel htmlFor="durationDays">Duration (days)</FieldLabel>
              <Input
                id="durationDays"
                name="durationDays"
                type="number"
                min={1}
                max={60}
                step={1}
                inputMode="numeric"
                defaultValue={tour?.durationDays ?? 1}
                aria-invalid={Boolean(errors.durationDays)}
              />
              {errors.durationDays ? (
                <FieldError>{errors.durationDays}</FieldError>
              ) : null}
            </Field>
            <Field data-invalid={Boolean(errors.maxGroupSize)}>
              <FieldLabel htmlFor="maxGroupSize">Max group size</FieldLabel>
              <Input
                id="maxGroupSize"
                name="maxGroupSize"
                type="number"
                min={1}
                max={100}
                step={1}
                inputMode="numeric"
                defaultValue={tour?.maxGroupSize ?? ''}
                placeholder="20"
                aria-invalid={Boolean(errors.maxGroupSize)}
              />
              {errors.maxGroupSize ? (
                <FieldError>{errors.maxGroupSize}</FieldError>
              ) : null}
            </Field>
          </div>
          <Field data-invalid={Boolean(errors.meetingPoint)}>
            <FieldLabel htmlFor="meetingPoint">Meeting point</FieldLabel>
            <Input
              id="meetingPoint"
              name="meetingPoint"
              maxLength={300}
              defaultValue={tour?.meetingPoint ?? ''}
              placeholder="Hoi An Tourist Info Centre, 78 Le Loi Street, Hoi An"
              aria-invalid={Boolean(errors.meetingPoint)}
            />
            <FieldDescription>
              Use a consistent format:{' '}
              <strong>venue name, street address, city</strong> — e.g. “Hoi An
              Tourist Info Centre, 78 Le Loi Street, Hoi An”.
            </FieldDescription>
            {errors.meetingPoint ? (
              <FieldError>{errors.meetingPoint}</FieldError>
            ) : null}
          </Field>
        </FieldGroup>
      </FieldSet>

      <Separator className="my-8" />

      {/* Pricing */}
      <FieldSet className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div>
          <FieldLegend className="mb-1.5 font-semibold">Pricing</FieldLegend>
          <FieldDescription>
            The base price, an optional strike-through anchor, and currency.
          </FieldDescription>
        </div>
        <FieldGroup className="grid grid-cols-1 gap-6 sm:grid-cols-3 md:col-span-2">
          <Field data-invalid={Boolean(errors.basePrice)}>
            <FieldLabel htmlFor="basePrice">Base price</FieldLabel>
            <Input
              id="basePrice"
              name="basePrice"
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              defaultValue={tour?.basePrice ?? ''}
              placeholder="49.50"
              aria-invalid={Boolean(errors.basePrice)}
            />
            {errors.basePrice ? (
              <FieldError>{errors.basePrice}</FieldError>
            ) : null}
          </Field>
          <Field data-invalid={Boolean(errors.compareAtPrice)}>
            <FieldLabel htmlFor="compareAtPrice">Compare-at</FieldLabel>
            <Input
              id="compareAtPrice"
              name="compareAtPrice"
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              defaultValue={tour?.compareAtPrice ?? ''}
              placeholder="69.00"
              aria-invalid={Boolean(errors.compareAtPrice)}
            />
            {errors.compareAtPrice ? (
              <FieldError>{errors.compareAtPrice}</FieldError>
            ) : null}
          </Field>
          <Field data-invalid={Boolean(errors.currency)}>
            <FieldLabel htmlFor="currency">Currency</FieldLabel>
            <Input
              id="currency"
              name="currency"
              maxLength={3}
              defaultValue={tour?.currency ?? 'USD'}
              placeholder="USD"
              className="uppercase"
              aria-invalid={Boolean(errors.currency)}
            />
            {errors.currency ? (
              <FieldError>{errors.currency}</FieldError>
            ) : null}
          </Field>
        </FieldGroup>
      </FieldSet>

      <Separator className="my-8" />

      {/* Classification */}
      <FieldSet className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div>
          <FieldLegend className="mb-1.5 font-semibold">
            Classification &amp; visibility
          </FieldLegend>
          <FieldDescription>
            Difficulty, and whether the tour is live / featured.
          </FieldDescription>
        </div>
        <FieldGroup className="grid grid-cols-1 gap-6 md:col-span-2">
          <Field data-invalid={Boolean(errors.difficulty)}>
            <FieldLabel htmlFor="difficulty">Difficulty</FieldLabel>
            <Input
              id="difficulty"
              name="difficulty"
              maxLength={30}
              defaultValue={tour?.difficulty ?? ''}
              placeholder="easy"
              className="max-w-xs"
              aria-invalid={Boolean(errors.difficulty)}
            />
            {errors.difficulty ? (
              <FieldError>{errors.difficulty}</FieldError>
            ) : null}
          </Field>
          <Field orientation="horizontal" className="items-center">
            <Switch
              id="isPublished"
              checked={isPublished}
              onCheckedChange={setIsPublished}
            />
            <input
              type="hidden"
              name="isPublished"
              value={isPublished ? 'true' : 'false'}
            />
            <div>
              <FieldLabel htmlFor="isPublished" className="font-normal">
                Published
              </FieldLabel>
              <FieldDescription>
                Unpublished tours are hidden from the public site.
              </FieldDescription>
            </div>
          </Field>
          <Field orientation="horizontal" className="items-center">
            <Switch
              id="isFeatured"
              checked={isFeatured}
              onCheckedChange={setIsFeatured}
            />
            <input
              type="hidden"
              name="isFeatured"
              value={isFeatured ? 'true' : 'false'}
            />
            <div>
              <FieldLabel htmlFor="isFeatured" className="font-normal">
                Featured
              </FieldLabel>
              <FieldDescription>
                Featured tours surface on the home-page shelf.
              </FieldDescription>
            </div>
          </Field>
        </FieldGroup>
      </FieldSet>

      <Separator className="my-8" />

      {/* Merchandising */}
      <FieldSet className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div>
          <FieldLegend className="mb-1.5 font-semibold">
            Merchandising
          </FieldLegend>
          <FieldDescription>
            Who the tour suits and the badges shown on its card.
          </FieldDescription>
        </div>
        <FieldGroup className="grid grid-cols-1 gap-6 md:col-span-2">
          <Field>
            <FieldLabel>Suitable for</FieldLabel>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {TRAVELLER_TYPES.map((t) => (
                <label key={t} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="suitableFor"
                    value={t}
                    className="accent-primary size-4"
                  />
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
                  <input
                    type="checkbox"
                    name="badges"
                    value={b}
                    className="accent-primary size-4"
                  />
                  {labelize(b)}
                </label>
              ))}
            </div>
          </Field>
          {tour ? (
            <FieldDescription>
              Check any to replace the current set; leave all unchecked to keep
              it unchanged.
            </FieldDescription>
          ) : null}
        </FieldGroup>
      </FieldSet>

      <Separator className="my-8" />

      {/* Content */}
      <FieldSet className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div>
          <FieldLegend className="mb-1.5 font-semibold">Content</FieldLegend>
          <FieldDescription>
            Highlights and the what&apos;s-included / excluded lists.
          </FieldDescription>
        </div>
        <FieldGroup className="grid grid-cols-1 gap-6 md:col-span-2">
          <Field>
            <FieldLabel htmlFor="highlights">Highlights</FieldLabel>
            <Textarea
              id="highlights"
              name="highlights"
              rows={4}
              defaultValue={(tour?.highlights ?? []).join('\n')}
              placeholder={
                'Skip-the-line entry\nLocal expert guide\nSmall group of 12'
              }
            />
            <FieldDescription>
              One highlight per line. Shown as a bulleted list on the tour page.
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="included">What&apos;s included</FieldLabel>
            <Textarea
              id="included"
              name="included"
              rows={4}
              defaultValue={(tour?.included ?? []).join('\n')}
              placeholder={
                '2 breakfasts, 1 lunch\nPrivate air-conditioned transfers\nEntrance fees'
              }
            />
            <FieldDescription>
              One item per line. Tip: include a meals line and a transport line
              — the tour page pulls those out into their own rows.
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="excluded">What&apos;s excluded</FieldLabel>
            <Textarea
              id="excluded"
              name="excluded"
              rows={3}
              defaultValue={(tour?.excluded ?? []).join('\n')}
              placeholder={
                'International flights\nPersonal expenses\nTravel insurance'
              }
            />
            <FieldDescription>One item per line.</FieldDescription>
          </Field>
        </FieldGroup>
      </FieldSet>

      <Separator className="my-8" />

      {/* Itinerary */}
      <RepeatableCards<{ title: string; description: string }>
        name="itinerary"
        legend="Itinerary"
        description="Day-by-day plan. Drag to reorder — the day number follows the order. The description supports Markdown for rich, structured days."
        addLabel="Add day"
        emptyText="No itinerary days yet."
        itemLabel="Day"
        initial={(tour?.itinerary ?? []).map((d) => ({
          title: d.title,
          description: d.description ?? '',
        }))}
        makeItem={() => ({ title: '', description: '' })}
        renderFields={(item, patch) => (
          <div className="space-y-3">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium">Title</span>
              <Input
                value={item.title}
                onChange={(e) => patch({ title: e.target.value })}
                maxLength={200}
                placeholder="Arrival & old town walk"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium">
                Description (Markdown)
              </span>
              <Textarea
                value={item.description}
                onChange={(e) => patch({ description: e.target.value })}
                rows={8}
                maxLength={8000}
                className="font-mono text-sm"
                placeholder={
                  '**08:00 — Hotel pickup** in the Old Town, then drive to Cu Chi.\n\nMorning highlights:\n- Watch the tunnel documentary\n- Crawl a tourist-safe tunnel section\n\n**12:00 — Lunch** by the river *(included)*.'
                }
              />
              <span className="text-muted-foreground text-xs">
                Markdown: <code>**bold**</code>, <code>*italic*</code>,{' '}
                <code>- bullet</code> (one per line),{' '}
                <code>### sub-heading</code>, blank line = new paragraph. Times
                like <code>08:00</code> read best in <strong>bold</strong> at
                the start of a line.
              </span>
            </label>
          </div>
        )}
      />

      <Separator className="my-8" />

      {/* FAQs */}
      <RepeatableCards<{ question: string; answer: string }>
        name="faqs"
        legend="FAQs"
        description="Common questions and answers shown on the tour page."
        addLabel="Add FAQ"
        emptyText="No FAQs yet."
        itemLabel="FAQ"
        initial={(tour?.faqs ?? []).map((f) => ({
          question: f.question,
          answer: f.answer,
        }))}
        makeItem={() => ({ question: '', answer: '' })}
        renderFields={(item, patch) => (
          <div className="space-y-3">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium">Question</span>
              <Input
                value={item.question}
                onChange={(e) => patch({ question: e.target.value })}
                maxLength={300}
                placeholder="Is hotel pickup included?"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium">Answer</span>
              <Textarea
                value={item.answer}
                onChange={(e) => patch({ answer: e.target.value })}
                rows={2}
                maxLength={2000}
                placeholder="Yes, within the old town."
              />
            </label>
          </div>
        )}
      />

      <Separator className="my-8" />

      {/* Policies */}
      <RepeatableCards<{ kind: string; title: string; body: string }>
        name="policies"
        legend="Policies"
        description="Cancellation, booking, and general policies. Kind is for grouping (not shown as-is); Title is the heading and Body is the text travellers read."
        addLabel="Add policy"
        emptyText="No policies yet."
        itemLabel="Policy"
        initial={(tour?.policies ?? []).map((p) => ({
          kind: p.kind,
          title: p.title,
          body: p.body,
        }))}
        makeItem={() => ({ kind: 'CANCELLATION', title: '', body: '' })}
        renderFields={(item, patch) => (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <span className="text-xs font-medium">Kind</span>
                <Select
                  value={item.kind}
                  onValueChange={(v) => patch({ kind: v ?? 'CANCELLATION' })}
                >
                  <SelectTrigger className="w-full" aria-label="Policy kind">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="start" alignItemWithTrigger={false}>
                    {POLICY_KINDS.map((k) => (
                      <SelectItem key={k} value={k}>
                        {labelize(k)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium">Title</span>
                <Input
                  value={item.title}
                  onChange={(e) => patch({ title: e.target.value })}
                  maxLength={200}
                  placeholder="Free cancellation up to 24h"
                />
              </label>
            </div>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium">Body</span>
              <Textarea
                value={item.body}
                onChange={(e) => patch({ body: e.target.value })}
                rows={2}
                maxLength={4000}
                placeholder="Full refund if cancelled 24h before departure."
              />
            </label>
          </div>
        )}
      />

      <Separator className="my-8" />

      {/* Images — shared MediaField (its own Form-Layout-2 section) */}
      <MediaField
        initial={initialMedia}
        onChange={setMedia}
        heroPurpose="TOUR_HERO"
        galleryPurpose="TOUR_GALLERY"
      />
      <input type="hidden" name="media" value={JSON.stringify(media)} />

      {state.error ? (
        <>
          <Separator className="my-8" />
          <ErrorAlert>{state.error}</ErrorAlert>
        </>
      ) : null}

      <Separator className="my-8" />

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          nativeButton={false}
          render={<Link href="/tours" />}
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

export default TourForm;
