import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@tourism/ui';

import { DepartureForm } from '../../../../../../components/departures/departure-form';
import { createDeparture } from '../../../../../../lib/departures/actions';
import { getTour, type TourDetail } from '../../../../../../lib/tours/data';

interface NewDeparturePageProps {
  params: Promise<{ slug: string }>;
}

export default async function NewDeparturePage({ params }: NewDeparturePageProps) {
  const { slug } = await params;

  let tour: TourDetail;
  try {
    tour = await getTour(slug);
  } catch {
    notFound();
  }

  const action = createDeparture.bind(null, slug);

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="space-y-3">
        <Button variant="ghost" size="sm" nativeButton={false} render={<Link href={`/tours/${slug}/departures`} />}>
          <ArrowLeft data-icon="inline-start" />
          Back to departures
        </Button>
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-bold">New departure</h1>
          <p className="text-muted-foreground text-sm">
            {tour.title} · base price {tour.currency} {tour.basePrice}
          </p>
        </div>
      </div>

      <DepartureForm action={action} slug={slug} submitLabel="Create departure" />
    </div>
  );
}
