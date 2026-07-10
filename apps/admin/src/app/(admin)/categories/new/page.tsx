import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@tourism/ui';

import { CategoryForm } from '../../../../components/categories/category-form';
import { createCategory } from '../../../../lib/categories/actions';

export default function NewCategoryPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
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
          <h1 className="font-heading text-2xl font-bold">New category</h1>
          <p className="text-muted-foreground text-sm">
            Add a theme to group your tours by. It starts active unless you turn
            it off.
          </p>
        </div>
      </div>

      <CategoryForm action={createCategory} submitLabel="Create category" />
    </div>
  );
}
