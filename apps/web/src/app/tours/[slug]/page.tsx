import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRightIcon, ClockIcon, MapPinIcon, StarIcon } from 'lucide-react';

import { messages } from '@tourism/i18n';

import { BookingBox } from '../../../components/tours/booking-box';
import { TourHighlights } from '../../../components/tours/tour-highlights';
import { TourItinerary } from '../../../components/tours/tour-itinerary';
import { TourIncluded } from '../../../components/tours/tour-included';
import { Gallery, type GallerySection } from '../../../components/marketing/gallery';
import { PlanTripForm } from '../../../components/marketing/plan-trip-form';
import { getTourDetail, tourSlugs } from '../../../lib/tours';

export function generateStaticParams() {
  return tourSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tour = getTourDetail(slug);
  if (!tour) return { title: 'Tour not found' };
  return {
    title: `${tour.title} — Tourism Platform`,
    description: tour.overview,
  };
}

export default async function TourDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tour = getTourDetail(slug);
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
      {/* Tour hero */}
      <section className="relative isolate flex min-h-88 items-end overflow-hidden lg:min-h-112">
        <Image src={cover} alt={tour.title} fill priority sizes="100vw" className="-z-10 object-cover" />
        <div className="from-overlay/85 via-overlay/45 absolute inset-0 -z-10 bg-linear-to-t to-transparent" />

        <div className="text-primary-foreground mx-auto w-full max-w-7xl px-4 pb-10 sm:px-6 lg:px-8 lg:pb-14">
          <nav
            aria-label="Breadcrumb"
            className="text-primary-foreground/80 mb-4 flex flex-wrap items-center gap-1.5 text-sm"
          >
            <Link href="/" className="hover:text-primary-foreground">
              {messages.common.home}
            </Link>
            <ChevronRightIcon className="size-4" />
            <Link href="/tours" className="hover:text-primary-foreground">
              {td.breadcrumb}
            </Link>
            <ChevronRightIcon className="size-4" />
            <span className="text-primary-foreground line-clamp-1">{tour.title}</span>
          </nav>

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
              <span className="text-primary-foreground/75">({tour.reviewCount})</span>
            </span>
          </div>
        </div>
      </section>

      {/* Body: main column + sticky booking aside */}
      <section className="py-12 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-[1fr_22rem] lg:gap-12">
            <div className="min-w-0 space-y-12 lg:space-y-16">
              <section>
                <h2 className="font-heading mb-4 text-2xl font-semibold sm:text-3xl">{td.overview}</h2>
                <p className="text-muted-foreground text-lg text-pretty">{tour.overview}</p>
              </section>
              <TourHighlights items={tour.highlights} />
              <TourItinerary days={tour.itinerary} />
              <TourIncluded included={tour.included} notIncluded={tour.notIncluded} />
            </div>

            <aside className="mt-10 lg:mt-0">
              <BookingBox
                currency={tour.currency}
                basePrice={tour.basePrice}
                departures={tour.departures}
              />
            </aside>
          </div>
        </div>
      </section>

      <Gallery sections={gallerySections} heading={td.gallery} subtitle="" />
      <PlanTripForm />
    </main>
  );
}
