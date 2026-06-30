import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@tourism/ui';

import { DestinationForm } from '../../../../../components/destinations/destination-form';
import { updateDestination } from '../../../../../lib/destinations/actions';
import { getDestination, type Destination } from '../../../../../lib/destinations/data';

interface EditDestinationPageProps {
  params: Promise<{ slug: string }>;
}

export default async function EditDestinationPage({ params }: EditDestinationPageProps) {
  const { slug } = await params;

  let destination: Destination;
  try {
    destination = await getDestination(slug);
  } catch {
    notFound();
  }

  const action = updateDestination.bind(null, slug);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 lg:px-6">
      <div className="space-y-3">
        <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/destinations" />}>
          <ArrowLeft data-icon="inline-start" />
          Back to destinations
        </Button>
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-bold">Edit destination</h1>
          <p className="text-muted-foreground text-sm">{destination.name}</p>
        </div>
      </div>

      <DestinationForm action={action} destination={destination} submitLabel="Save changes" />
    </div>
  );
}
