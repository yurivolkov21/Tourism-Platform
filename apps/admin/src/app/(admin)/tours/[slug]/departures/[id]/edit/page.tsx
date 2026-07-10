import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@tourism/ui';

import { DepartureForm } from '../../../../../../../components/departures/departure-form';
import { updateDeparture } from '../../../../../../../lib/departures/actions';
import { findDeparture } from '../../../../../../../lib/departures/data';
import { toDateOnly } from '../../../../../../../lib/departures/format';

interface EditDeparturePageProps {
  params: Promise<{ slug: string; id: string }>;
}

export default async function EditDeparturePage({
  params,
}: EditDeparturePageProps) {
  const { slug, id } = await params;

  let departure;
  try {
    departure = await findDeparture(slug, id);
  } catch {
    notFound();
  }
  if (!departure) notFound();

  const action = updateDeparture.bind(null, slug, id);

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="space-y-3">
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href={`/tours/${slug}/departures`} />}
        >
          <ArrowLeft data-icon="inline-start" />
          Back to departures
        </Button>
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-bold">Edit departure</h1>
          <p className="text-muted-foreground text-sm">
            {toDateOnly(departure.startDate)} → {toDateOnly(departure.endDate)}
          </p>
        </div>
      </div>

      <DepartureForm
        action={action}
        departure={departure}
        slug={slug}
        submitLabel="Save changes"
      />
    </div>
  );
}
