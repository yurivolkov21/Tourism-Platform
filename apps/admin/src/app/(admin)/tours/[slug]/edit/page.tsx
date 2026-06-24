import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@tourism/ui';

import { listCategories } from '../../../../../lib/categories/data';
import { listDestinations } from '../../../../../lib/destinations/data';
import { TourForm } from '../../../../../components/tours/tour-form';
import { updateTour } from '../../../../../lib/tours/actions';
import { getTour, type TourDetail } from '../../../../../lib/tours/data';

interface EditTourPageProps {
  params: Promise<{ slug: string }>;
}

export default async function EditTourPage({ params }: EditTourPageProps) {
  const { slug } = await params;

  let tour: TourDetail;
  try {
    tour = await getTour(slug);
  } catch {
    notFound();
  }

  const [cats, dests] = await Promise.all([
    listCategories({ pageSize: 100 }),
    listDestinations({ pageSize: 100 }),
  ]);
  const categories = cats.data.map((c) => ({ slug: c.slug, name: c.name }));
  const destinations = dests.data.map((d) => ({ slug: d.slug, name: d.name }));

  const action = updateTour.bind(null, slug);

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="space-y-3">
        <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/tours" />}>
          <ArrowLeft data-icon="inline-start" />
          Back to tours
        </Button>
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-bold">Edit tour</h1>
          <p className="text-muted-foreground text-sm">{tour.title}</p>
        </div>
      </div>

      <TourForm
        action={action}
        categories={categories}
        destinations={destinations}
        tour={tour}
        submitLabel="Save changes"
      />
    </div>
  );
}
