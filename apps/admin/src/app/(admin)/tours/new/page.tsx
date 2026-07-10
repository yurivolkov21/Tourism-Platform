import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@tourism/ui';

import { apiErrorMessage } from '../../../../lib/api/error';
import { listCategories } from '../../../../lib/categories/data';
import { listDestinations } from '../../../../lib/destinations/data';
import { TourForm } from '../../../../components/tours/tour-form';
import { createTour } from '../../../../lib/tours/actions';
import { ErrorAlert } from '../../../../components/crud/error-alert';

export default async function NewTourPage() {
  let categories: { slug: string; name: string }[] = [];
  let destinations: { slug: string; name: string }[] = [];
  let error: string | null = null;
  try {
    const [cats, dests] = await Promise.all([
      listCategories({ pageSize: 100 }),
      listDestinations({ pageSize: 100 }),
    ]);
    categories = cats.data.map((c) => ({ slug: c.slug, name: c.name }));
    destinations = dests.data.map((d) => ({ slug: d.slug, name: d.name }));
  } catch (e) {
    error = apiErrorMessage(e);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 lg:px-6">
      <div className="space-y-3">
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href="/tours" />}
        >
          <ArrowLeft data-icon="inline-start" />
          Back to tours
        </Button>
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-bold">New tour</h1>
          <p className="text-muted-foreground text-sm">
            Create a tour. It starts as a draft unless you publish it.
          </p>
        </div>
      </div>

      {error ? (
        <ErrorAlert>
          Couldn&apos;t load categories/destinations: {error}. Check that the
          API is running and your admin session is valid.
        </ErrorAlert>
      ) : (
        <TourForm
          action={createTour}
          categories={categories}
          destinations={destinations}
          submitLabel="Create tour"
        />
      )}
    </div>
  );
}
