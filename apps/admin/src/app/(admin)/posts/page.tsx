import Link from 'next/link';
import { Plus } from 'lucide-react';

import { Button } from '@tourism/ui';

import { apiErrorMessage } from '../../../lib/api/error';
import { AdminListHeader } from '../../../components/crud/list-header';
import { PostsTable } from '../../../components/posts/posts-table';
import { listPosts, type PostList } from '../../../lib/posts/data';
import { ErrorAlert } from '../../../components/crud/error-alert';

export default async function PostsPage() {
  let result: PostList | undefined;
  let error: string | null = null;
  try {
    result = await listPosts({ pageSize: 100 });
  } catch (e) {
    error = apiErrorMessage(e);
  }

  const rows = result?.data ?? [];

  return (
    <div className="flex flex-col gap-6 px-4 py-6 lg:px-6">
      <AdminListHeader
        title="Posts"
        description="Editorial blog posts. Drafts are shown here too; only published posts appear on the site."
        action={
          <Button nativeButton={false} render={<Link href="/posts/new" />}>
            <Plus data-icon="inline-start" />
            New post
          </Button>
        }
      />

      {error ? (
        <ErrorAlert>
          Couldn&apos;t load posts: {error}. Check that the API is running and your admin session is
          valid.
        </ErrorAlert>
      ) : (
        <PostsTable rows={rows} />
      )}
    </div>
  );
}
