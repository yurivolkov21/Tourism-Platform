import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { ArrowLeft, Pencil } from 'lucide-react';

import { Badge, Button, Separator } from '@tourism/ui';

import { RowActions } from '../../../../components/crud/row-actions';
import { deleteCategory } from '../../../../lib/categories/actions';
import { getCategory, type Category } from '../../../../lib/categories/data';

interface CategoryDetailPageProps {
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

export default async function CategoryDetailPage({ params }: CategoryDetailPageProps) {
  const { slug } = await params;

  let category: Category;
  try {
    category = await getCategory(slug);
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 lg:px-6">
      <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/categories" />}>
        <ArrowLeft data-icon="inline-start" />
        Back to categories
      </Button>

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

      <Separator />

      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
        <Fact label="Display order" value={category.order} />
        <Fact label="Slug" value={<code className="text-xs">{category.slug}</code>} />
        <Fact label="Status" value={category.isActive ? 'Active' : 'Draft'} />
        <Fact label="Created" value={formatDate(category.createdAt)} />
        <Fact label="Updated" value={formatDate(category.updatedAt)} />
      </dl>

      <Separator />

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Description</h2>
        <p className="text-muted-foreground text-sm whitespace-pre-line">
          {category.description?.trim() || 'No description yet.'}
        </p>
      </section>
    </div>
  );
}
