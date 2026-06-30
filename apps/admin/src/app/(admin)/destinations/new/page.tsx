import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@tourism/ui';

import { DestinationForm } from '../../../../components/destinations/destination-form';
import { createDestination } from '../../../../lib/destinations/actions';

export default function NewDestinationPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 lg:px-6">
      <div className="space-y-3">
        <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/destinations" />}>
          <ArrowLeft data-icon="inline-start" />
          Back to destinations
        </Button>
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-bold">New destination</h1>
          <p className="text-muted-foreground text-sm">
            Add a place your tours run in. It starts active unless you turn it off.
          </p>
        </div>
      </div>

      <DestinationForm action={createDestination} submitLabel="Create destination" />
    </div>
  );
}
