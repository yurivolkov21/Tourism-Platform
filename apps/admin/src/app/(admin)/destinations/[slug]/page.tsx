import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { ArrowLeft, Pencil } from 'lucide-react';

import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@tourism/ui';

import { LinkedToursCard } from '../../../../components/crud/linked-tours-card';
import { RowActions } from '../../../../components/crud/row-actions';
import { DestinationMediaView } from '../../../../components/destinations/destination-media-view';
import { deleteDestination } from '../../../../lib/destinations/actions';
import { getDestination, type DestinationDetail } from '../../../../lib/destinations/data';
import { formatRelativeTime } from '../../../../lib/relative-time';

interface DestinationDetailPageProps {
  params: Promise<{ slug: string }>;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Label/value row for the details rail. */
function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="text-right text-sm font-medium">{value}</dd>
    </div>
  );
}

export default async function DestinationDetailPage({ params }: DestinationDetailPageProps) {
  const { slug } = await params;

  let destination: DestinationDetail;
  try {
    destination = await getDestination(slug);
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 lg:px-6">
      <Link
        href="/destinations"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-4" />
        Back to destinations
      </Link>

      {/* Header */}
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Images</CardTitle>
            </CardHeader>
            <CardContent>
              <DestinationMediaView media={destination.media} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm whitespace-pre-line">
                {destination.description?.trim() || 'No description yet.'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Rail */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <Row label="Region" value={destination.region ?? '—'} />
                <Row label="Country" value={destination.country} />
                <Row label="Slug" value={<code className="text-xs">{destination.slug}</code>} />
                <Row label="Status" value={destination.isActive ? 'Active' : 'Draft'} />
                <Row
                  label="Created"
                  value={
                    <span className="font-normal">
                      {formatDate(destination.createdAt)}
                      <span className="text-muted-foreground ml-1.5 text-xs">
                        {formatRelativeTime(destination.createdAt)}
                      </span>
                    </span>
                  }
                />
                <Row
                  label="Updated"
                  value={
                    <span className="font-normal">
                      {formatDate(destination.updatedAt)}
                      <span className="text-muted-foreground ml-1.5 text-xs">
                        {formatRelativeTime(destination.updatedAt)}
                      </span>
                    </span>
                  }
                />
              </dl>
            </CardContent>
          </Card>

          <LinkedToursCard
            title="Used by tours"
            tours={destination.tours}
            emptyText="No tours use this destination yet."
          />
        </div>
      </div>
    </div>
  );
}
