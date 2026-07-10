import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@tourism/ui';

import { CategoryForm } from '../../../../../components/categories/category-form';
import { updateCategory } from '../../../../../lib/categories/actions';
import { getCategory, type Category } from '../../../../../lib/categories/data';

interface EditCategoryPageProps {
  params: Promise<{ slug: string }>;
}

export default async function EditCategoryPage({
  params,
}: EditCategoryPageProps) {
  const { slug } = await params;

  let category: Category;
  try {
    category = await getCategory(slug);
  } catch {
    notFound();
  }

  const action = updateCategory.bind(null, slug);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 lg:px-6">
      <div className="space-y-3">
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href="/categories" />}
        >
          <ArrowLeft data-icon="inline-start" />
          Back to categories
        </Button>
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-bold">Edit category</h1>
          <p className="text-muted-foreground text-sm">{category.name}</p>
        </div>
      </div>

      <CategoryForm
        action={action}
        category={category}
        submitLabel="Save changes"
      />
    </div>
  );
}
