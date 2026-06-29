import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRightIcon, ClockIcon, MapPinIcon, StarIcon } from 'lucide-react';

import { ScrollProgress } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { BookingBox } from '../../../components/tours/booking-box';
import { TourOverview } from '../../../components/tours/tour-overview';
import { TourValue } from '../../../components/tours/tour-value';
import { TourItinerary } from '../../../components/tours/tour-itinerary';
import { TourIncluded } from '../../../components/tours/tour-included';
import { TourPolicies } from '../../../components/tours/tour-policies';
import { TourReviews } from '../../../components/tours/tour-reviews';
import { TourTrust } from '../../../components/tours/tour-trust';
import { TourFaq } from '../../../components/tours/tour-faq';
import { RelatedTours } from '../../../components/tours/related-tours';
import { Gallery, type GallerySection } from '../../../components/marketing/gallery';
import { EnquiryCta } from '../../../components/marketing/enquiry-cta';
import { fetchTourDetail, fetchTourDetailSlugs } from '../../../lib/api/tour-detail';

// ISR: render real tour detail statically; revalidate so the free API tier isn't hit per request.
export const revalidate = 300;

export async function generateStaticParams() {
  const slugs = await fetchTourDetailSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tour = await fetchTourDetail(slug);
  if (!tour) return { title: 'Tour not found' };
  return {
    title: `${tour.title} — Tourism Platform`,
    description: tour.overview,
  };
}

export default async function TourDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tour = await fetchTourDetail(slug);
  if (!tour) notFound();

  const td = messages.tourDetail;
  const cover = tour.image ?? tour.gallery[0] ?? '';

  const galleryImages = tour.gallery.map((src) => ({ src, alt: tour.title }));
  const gallerySections: GallerySection[] =
    galleryImages.length > 1
      ? [{ images: [galleryImages[0]] }, { type: 'grid', images: galleryImages.slice(1) }]
      : [{ images: galleryImages }];

  return (
    <main>
      {/* Reading-progress bar for this long detail page */}
      <ScrollProgress />

      {/* Tour hero */}
      <section className="relative isolate flex min-h-88 items-end overflow-hidden lg:min-h-112">
        <Image src={cover} alt={tour.title} fill priority sizes="100vw" className="-z-10 object-cover" />
        <div className="from-overlay/85 via-overlay/45 absolute inset-0 -z-10 bg-linear-to-t to-transparent" />

        <div className="text-on-media mx-auto w-full max-w-7xl px-4 pb-10 sm:px-6 lg:px-8 lg:pb-14">
          <nav
            aria-label="Breadcrumb"
            className="text-on-media/80 mb-4 flex flex-wrap items-center gap-1.5 text-sm"
          >
            <Link href="/" className="hover:text-on-media">
              {messages.common.home}
            </Link>
            <ChevronRightIcon className="size-4" />
            <Link href="/tours" className="hover:text-on-media">
              {td.breadcrumb}
            </Link>
            <ChevronRightIcon className="size-4" />
            <span className="text-on-media line-clamp-1">{tour.title}</span>
          </nav>

          {tour.badge ? (
            <span className="bg-rating text-foreground mb-3 inline-flex w-fit items-center rounded-full px-3 py-1 font-sans text-xs font-bold tracking-wide uppercase">
              {td.badges[tour.badge]}
            </span>
          ) : null}

          <h1 className="font-heading max-w-3xl text-3xl font-bold text-balance sm:text-4xl lg:text-5xl">
            {tour.title}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm">
            <span className="inline-flex items-center gap-1.5">
              <MapPinIcon className="size-4" />
              {tour.destination}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ClockIcon className="size-4" />
              {tour.durationDays} {messages.featuredTours.daysLabel}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <StarIcon className="fill-rating text-rating size-4" />
              <span className="font-semibold">{tour.rating.toFixed(1)}</span>
              <span className="text-on-media/75">({tour.reviewCount})</span>
            </span>
          </div>
        </div>
      </section>

      {/* Gallery leads the page (Lily-style: imagery before the detail body) */}
      <Gallery sections={gallerySections} heading={td.gallery} subtitle="" />

      {/* Body: main column + sticky booking aside */}
      <section className="bg-muted/30 py-12 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-[1fr_22rem] lg:gap-12">
            <div className="min-w-0 space-y-6 lg:space-y-8">
              <TourOverview tour={tour} />
              <TourValue />
              <TourItinerary days={tour.itinerary} />
              <TourIncluded
                meals={tour.meals}
                transport={tour.transport}
                accommodation={tour.accommodation}
                activities={tour.included}
                excluded={tour.notIncluded}
              />
              <TourPolicies
                groups={tour.policies?.map((p) => ({ title: p.title, items: [p.body] }))}
              />
            </div>

            <aside className="mt-10 lg:mt-0">
              <BookingBox
                slug={tour.slug}
                tourId={tour.id}
                currency={tour.currency}
                basePrice={tour.basePrice}
                compareAtPrice={tour.compareAtPrice}
                rating={tour.rating}
                reviewCount={tour.reviewCount}
                meals={tour.meals}
                departures={tour.departures}
              />
            </aside>
          </div>
        </div>
      </section>

      <TourReviews reviews={tour.reviews} rating={tour.rating} reviewCount={tour.reviewCount} />
      <TourTrust />
      <TourFaq items={tour.faqs?.map((f) => ({ q: f.question, a: f.answer }))} />
      <RelatedTours tours={tour.related} />
      <EnquiryCta heading={td.enquireHeading(tour.title)} prefillDestination={tour.title} />
    </main>
  );
}
