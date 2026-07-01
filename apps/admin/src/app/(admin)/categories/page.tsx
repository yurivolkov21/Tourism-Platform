import Link from 'next/link';
import { Plus, Tags } from 'lucide-react';

import {
  Button,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@tourism/ui';

import { apiErrorMessage } from '../../../lib/api/error';
import { AdminListHeader } from '../../../components/crud/list-header';
import { CategoriesTable } from '../../../components/categories/categories-table';
import { listCategories, type CategoryList } from '../../../lib/categories/data';
import { ErrorAlert } from '../../../components/crud/error-alert';

export default async function CategoriesPage() {
  // Load the whole (small) catalog once; the table filters/searches client-side for instant UX.
  let result: CategoryList | undefined;
  let error: string | null = null;
  try {
    result = await listCategories({ pageSize: 100 });
  } catch (e) {
    error = apiErrorMessage(e);
  }

  const rows = result?.data ?? [];

  return (
    <div className="flex flex-col gap-6 px-4 py-6 lg:px-6">
      <AdminListHeader
        title="Tour categories"
        description="Group your tours by theme. Drafts (inactive) are shown here too; the public display order is set by each category’s “Order”."
        action={
          <Button nativeButton={false} render={<Link href="/categories/new" />}>
            <Plus data-icon="inline-start" />
            New category
          </Button>
        }
      />

      {error ? (
        <ErrorAlert>
          Couldn&apos;t load categories: {error}. Check that the API is running and your admin session
          is valid.
        </ErrorAlert>
      ) : rows.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Tags />
            </EmptyMedia>
            <EmptyTitle>No categories yet</EmptyTitle>
            <EmptyDescription>Create your first category to start organizing tours.</EmptyDescription>
          </EmptyHeader>
          <Button nativeButton={false} render={<Link href="/categories/new" />}>
            <Plus data-icon="inline-start" />
            New category
          </Button>
        </Empty>
      ) : (
        <CategoriesTable rows={rows} />
      )}
    </div>
  );
}
