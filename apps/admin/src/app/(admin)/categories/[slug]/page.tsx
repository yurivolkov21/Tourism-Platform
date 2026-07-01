import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { ArrowLeft, Pencil } from 'lucide-react';

import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@tourism/ui';

import { LinkedToursCard } from '../../../../components/crud/linked-tours-card';
import { RowActions } from '../../../../components/crud/row-actions';
import { deleteCategory } from '../../../../lib/categories/actions';
import { getCategory, type CategoryDetail } from '../../../../lib/categories/data';
import { formatRelativeTime } from '../../../../lib/relative-time';

interface CategoryDetailPageProps {
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

export default async function CategoryDetailPage({ params }: CategoryDetailPageProps) {
  const { slug } = await params;

  let category: CategoryDetail;
  try {
    category = await getCategory(slug);
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 lg:px-6">
      <Link
        href="/categories"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-4" />
        Back to categories
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-2xl font-bold tracking-tight">{category.name}</h1>
            <Badge variant={category.isActive ? 'default' : 'secondary'} className="gap-1.5">
              <span className="size-1.5 rounded-full bg-current opacity-70" aria-hidden />
              {category.isActive ? 'Active' : 'Draft'}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">Display order {category.order}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/categories/${category.slug}/edit`} />}
          >
            <Pencil data-icon="inline-start" />
            Edit
          </Button>
          <RowActions
            editHref={`/categories/${category.slug}/edit`}
            deleteAction={deleteCategory}
            deleteId={category.slug}
            deleteTitle={`Delete “${category.name}”?`}
            deleteDescription="This permanently deletes the category and can’t be undone. You can only delete one that’s turned off (Draft) and has no tours attached."
            redirectTo="/categories"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm whitespace-pre-line">
                {category.description?.trim() || 'No description yet.'}
              </p>
            </CardContent>
          </Card>

          <LinkedToursCard
            title="Tours in this category"
            tours={category.tours}
            emptyText="No tours are in this category yet."
          />
        </div>

        {/* Rail */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <Row label="Display order" value={category.order} />
                <Row label="Slug" value={<code className="text-xs">{category.slug}</code>} />
                <Row label="Status" value={category.isActive ? 'Active' : 'Draft'} />
                <Row
                  label="Created"
                  value={
                    <span className="font-normal">
                      {formatDate(category.createdAt)}
                      <span className="text-muted-foreground ml-1.5 text-xs">
                        {formatRelativeTime(category.createdAt)}
                      </span>
                    </span>
                  }
                />
                <Row
                  label="Updated"
                  value={
                    <span className="font-normal">
                      {formatDate(category.updatedAt)}
                      <span className="text-muted-foreground ml-1.5 text-xs">
                        {formatRelativeTime(category.updatedAt)}
                      </span>
                    </span>
                  }
                />
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
