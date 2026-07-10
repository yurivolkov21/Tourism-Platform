import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { ArrowLeft, CalendarRange, Check, Pencil, Star, X } from 'lucide-react';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Separator,
} from '@tourism/ui';

import { RowActions } from '../../../../components/crud/row-actions';
import { DestinationMediaView } from '../../../../components/destinations/destination-media-view';
import { deleteTour } from '../../../../lib/tours/actions';
import { getTour, type TourDetail } from '../../../../lib/tours/data';
import {
  listDepartures,
  type Departure,
} from '../../../../lib/departures/data';
import { isDeparturePast } from '../../../../lib/departures/format';
import { formatRelativeTime } from '../../../../lib/relative-time';

interface TourDetailPageProps {
  params: Promise<{ slug: string }>;
}

function money(value: string, currency: string): string {
  const n = Number(value);
  const body = Number.isFinite(n)
    ? n.toLocaleString('en-US', { minimumFractionDigits: 2 })
    : value;
  return currency === 'USD' ? `$${body}` : `${currency} ${body}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
}

/** `BEST_VALUE` → `Best value`. */
function labelize(s: string): string {
  return s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, ' ');
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="text-right text-sm font-medium">{value}</dd>
    </div>
  );
}

export default async function TourDetailPage({ params }: TourDetailPageProps) {
  const { slug } = await params;

  let tour: TourDetail;
  let departures: Departure[];
  try {
    [tour, departures] = await Promise.all([
      getTour(slug),
      listDepartures(slug).catch(() => []),
    ]);
  } catch {
    notFound();
  }

  const primary =
    tour.destinations.find((d) => d.isPrimary) ?? tour.destinations[0];
  const upcoming = departures.filter(
    (d) => d.status === 'OPEN' && !isDeparturePast(d.startDate),
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 lg:px-6">
      <Link
        href="/tours"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-4" />
        Back to tours
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-2xl font-bold tracking-tight">
              {tour.title}
            </h1>
            <Badge variant={tour.isPublished ? 'default' : 'secondary'}>
              {tour.isPublished ? 'Published' : 'Draft'}
            </Badge>
            {tour.isFeatured ? <Badge variant="outline">Featured</Badge> : null}
          </div>
          <p className="text-muted-foreground text-sm">
            {tour.category.name} · {primary?.destination.name ?? '—'} ·{' '}
            {tour.durationDays} {tour.durationDays === 1 ? 'day' : 'days'} ·{' '}
            {money(tour.basePrice, tour.currency)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/tours/${tour.slug}/departures`} />}
          >
            <CalendarRange data-icon="inline-start" />
            Departures
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/tours/${tour.slug}/edit`} />}
          >
            <Pencil data-icon="inline-start" />
            Edit
          </Button>
          <RowActions
            editHref={`/tours/${tour.slug}/edit`}
            deleteAction={deleteTour}
            deleteId={tour.slug}
            deleteTitle={`Delete “${tour.title}”?`}
            deleteDescription="This permanently deletes the tour and can’t be undone. You can only delete one that’s unpublished (Draft) and has no bookings."
            redirectTo="/tours"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Images</CardTitle>
            </CardHeader>
            <CardContent>
              <DestinationMediaView
                media={tour.media}
                emptyText="No images for this tour yet."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-muted-foreground text-sm whitespace-pre-line">
                {tour.summary?.trim() || 'No summary yet.'}
              </p>

              {tour.highlights.length ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Highlights</p>
                  <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
                    {tour.highlights.map((h, i) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {tour.included.length || tour.excluded.length ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {tour.included.length ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">
                        What&apos;s included
                      </p>
                      <ul className="space-y-1 text-sm">
                        {tour.included.map((item, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <Check
                              className="mt-0.5 size-3.5 shrink-0 text-emerald-600"
                              aria-hidden
                            />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {tour.excluded.length ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">
                        What&apos;s excluded
                      </p>
                      <ul className="space-y-1 text-sm">
                        {tour.excluded.map((item, i) => (
                          <li
                            key={i}
                            className="text-muted-foreground flex items-start gap-2"
                          >
                            <X
                              className="mt-0.5 size-3.5 shrink-0"
                              aria-hidden
                            />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </CardContent>
          </Card>

          {tour.itinerary.length ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Itinerary</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-4">
                  {tour.itinerary.map((day) => (
                    <li key={day.id} className="flex gap-3">
                      <span className="bg-primary/10 text-primary flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                        {day.dayNumber}
                      </span>
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">{day.title}</p>
                        {day.description?.trim() ? (
                          <p className="text-muted-foreground text-sm whitespace-pre-line">
                            {day.description}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          ) : null}

          {tour.faqs.length ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">FAQs</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="divide-y">
                  {tour.faqs.map((faq) => (
                    <div
                      key={faq.id}
                      className="space-y-1 py-3 first:pt-0 last:pb-0"
                    >
                      <dt className="text-sm font-medium">{faq.question}</dt>
                      <dd className="text-muted-foreground text-sm whitespace-pre-line">
                        {faq.answer}
                      </dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          ) : null}

          {tour.policies.length ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Policies</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tour.policies.map((policy) => (
                    <div key={policy.id} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {labelize(policy.kind)}
                        </Badge>
                        <p className="text-sm font-medium">{policy.title}</p>
                      </div>
                      <p className="text-muted-foreground text-sm whitespace-pre-line">
                        {policy.body}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>

        {/* Rail */}
        <div className="space-y-6">
          {tour.ops ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3">
                  <Row
                    label="Bookings"
                    value={
                      <span className="tabular-nums">
                        {tour.ops.bookingsPaid}
                        <span className="text-muted-foreground">
                          {' '}
                          paid / {tour.ops.bookingsTotal}
                        </span>
                      </span>
                    }
                  />
                  <Row
                    label="Revenue"
                    value={money(tour.ops.revenue, tour.currency)}
                  />
                  <Row label="Wishlist saves" value={tour.ops.wishlistCount} />
                  <Row label="Enquiries" value={tour.ops.enquiriesCount} />
                </dl>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Departures</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcoming.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No upcoming departures — travellers see Private request only.
                </p>
              ) : (
                upcoming.slice(0, 3).map((d) => {
                  const pct =
                    d.seatsTotal > 0
                      ? Math.round((d.seatsBooked / d.seatsTotal) * 100)
                      : 0;
                  return (
                    <Link
                      key={d.id}
                      href={`/tours/${tour.slug}/departures/${d.id}`}
                      className="hover:bg-muted/60 block space-y-1.5 rounded-lg border p-2.5 transition-colors"
                    >
                      <span className="flex items-center justify-between text-sm">
                        <span className="font-medium">
                          {formatDate(d.startDate)}
                        </span>
                        <span className="text-muted-foreground tabular-nums">
                          {d.seatsBooked}/{d.seatsTotal} seats
                        </span>
                      </span>
                      <span className="bg-muted block h-1 overflow-hidden rounded-full">
                        <span
                          className="bg-primary block h-full rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </span>
                    </Link>
                  );
                })
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                nativeButton={false}
                render={<Link href={`/tours/${tour.slug}/departures`} />}
              >
                View all departures
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <Row
                  label="Price"
                  value={
                    <span className="tabular-nums">
                      {money(tour.basePrice, tour.currency)}
                      {tour.compareAtPrice ? (
                        <span className="text-muted-foreground ml-1.5 text-xs line-through">
                          {money(tour.compareAtPrice, tour.currency)}
                        </span>
                      ) : null}
                    </span>
                  }
                />
                <Row
                  label="Duration"
                  value={`${tour.durationDays} ${tour.durationDays === 1 ? 'day' : 'days'}`}
                />
                <Row label="Max group" value={tour.maxGroupSize} />
                {tour.difficulty ? (
                  <Row label="Difficulty" value={labelize(tour.difficulty)} />
                ) : null}
                <Row
                  label="Rating"
                  value={
                    tour.reviewsCount > 0 ? (
                      <Link
                        href="/reviews"
                        className="hover:text-primary inline-flex items-center gap-1 hover:underline"
                      >
                        <Star
                          className="size-3.5 fill-amber-400 text-amber-400"
                          aria-hidden
                        />
                        {tour.averageRating.toFixed(1)}
                        <span className="text-muted-foreground text-xs">
                          ({tour.reviewsCount})
                        </span>
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">No reviews</span>
                    )
                  }
                />
                <Row
                  label="Next departure"
                  value={
                    tour.nextDepartureDate ? (
                      <span>
                        {formatDate(tour.nextDepartureDate)}
                        {typeof tour.nextDepartureSeatsLeft === 'number' ? (
                          <span className="text-muted-foreground ml-1.5 text-xs">
                            {tour.nextDepartureSeatsLeft} left
                          </span>
                        ) : null}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        None scheduled
                      </span>
                    )
                  }
                />
                {tour.meetingPoint ? (
                  <Row label="Meeting point" value={tour.meetingPoint} />
                ) : null}
                <Row
                  label="Slug"
                  value={<code className="text-xs">{tour.slug}</code>}
                />
                <Row
                  label="Created"
                  value={
                    <span className="font-normal">
                      {formatDate(tour.createdAt)}
                      <span className="text-muted-foreground ml-1.5 text-xs">
                        {formatRelativeTime(tour.createdAt)}
                      </span>
                    </span>
                  }
                />
                <Row
                  label="Updated"
                  value={
                    <span className="font-normal">
                      {formatDate(tour.updatedAt)}
                      <span className="text-muted-foreground ml-1.5 text-xs">
                        {formatRelativeTime(tour.updatedAt)}
                      </span>
                    </span>
                  }
                />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Category &amp; destinations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs">Category</p>
                <Link
                  href={`/categories/${tour.category.slug}`}
                  className="hover:text-primary text-sm font-medium hover:underline"
                >
                  {tour.category.name}
                </Link>
              </div>
              <Separator />
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs">Destinations</p>
                <ul className="space-y-1.5">
                  {tour.destinations.map((d) => (
                    <li
                      key={d.destination.slug}
                      className="flex items-center justify-between gap-2"
                    >
                      <Link
                        href={`/destinations/${d.destination.slug}`}
                        className="hover:text-primary text-sm hover:underline"
                      >
                        {d.destination.name}
                      </Link>
                      {d.isPrimary ? (
                        <Badge variant="outline" className="text-xs">
                          Primary
                        </Badge>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          {tour.suitableFor.length || tour.badges.length ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Merchandising</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {tour.suitableFor.length ? (
                  <div className="space-y-1.5">
                    <p className="text-muted-foreground text-xs">
                      Suitable for
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {tour.suitableFor.map((t) => (
                        <Badge key={t} variant="secondary" className="text-xs">
                          {labelize(t)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}
                {tour.badges.length ? (
                  <div className="space-y-1.5">
                    <p className="text-muted-foreground text-xs">Badges</p>
                    <div className="flex flex-wrap gap-1.5">
                      {tour.badges.map((b) => (
                        <Badge key={b} variant="outline" className="text-xs">
                          {labelize(b)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
