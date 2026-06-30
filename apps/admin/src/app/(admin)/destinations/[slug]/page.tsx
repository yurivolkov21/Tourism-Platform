import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { ArrowLeft, Pencil } from 'lucide-react';

import { Badge, Button, Separator } from '@tourism/ui';

import { RowActions } from '../../../../components/crud/row-actions';
import { DestinationMediaView } from '../../../../components/destinations/destination-media-view';
import { deleteDestination } from '../../../../lib/destinations/actions';
import { getDestination, type Destination } from '../../../../lib/destinations/data';

interface DestinationDetailPageProps {
  params: Promise<{ slug: string }>;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  );
}

export default async function DestinationDetailPage({ params }: DestinationDetailPageProps) {
  const { slug } = await params;

  let destination: Destination;
  try {
    destination = await getDestination(slug);
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 lg:px-6">
      <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/destinations" />}>
        <ArrowLeft data-icon="inline-start" />
        Back to destinations
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-2xl font-bold tracking-tight">{destination.name}</h1>
            <Badge variant={destination.isActive ? 'default' : 'secondary'} className="gap-1.5">
              <span className="size-1.5 rounded-full bg-current opacity-70" aria-hidden />
              {destination.isActive ? 'Active' : 'Draft'}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            {destination.region ?? '—'} · {destination.country}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/destinations/${destination.slug}/edit`} />}
          >
            <Pencil data-icon="inline-start" />
            Edit
          </Button>
          <RowActions
            editHref={`/destinations/${destination.slug}/edit`}
            deleteAction={deleteDestination}
            deleteId={destination.slug}
            deleteTitle={`Delete “${destination.name}”?`}
            deleteDescription="This permanently deletes the destination and can’t be undone. You can only delete one that’s turned off (Draft) and has no tours attached."
            redirectTo="/destinations"
          />
        </div>
      </div>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Images</h2>
        <DestinationMediaView media={destination.media} />
      </section>

      <Separator />

      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
        <Fact label="Region" value={destination.region ?? '—'} />
        <Fact label="Country" value={destination.country} />
        <Fact label="Slug" value={<code className="text-xs">{destination.slug}</code>} />
        <Fact label="Status" value={destination.isActive ? 'Active' : 'Draft'} />
        <Fact label="Created" value={formatDate(destination.createdAt)} />
        <Fact label="Updated" value={formatDate(destination.updatedAt)} />
      </dl>

      <Separator />

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Description</h2>
        <p className="text-muted-foreground text-sm whitespace-pre-line">
          {destination.description?.trim() || 'No description yet.'}
        </p>
      </section>
    </div>
  );
}
