import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@tourism/ui';

import { PostForm } from '../../../../components/posts/post-form';
import { createPost } from '../../../../lib/posts/actions';
import { listPostTags } from '../../../../lib/posts/data';
import { listTours } from '../../../../lib/tours/data';

export default async function NewPostPage() {
  const [tagSuggestions, tourOptions] = await Promise.all([
    listPostTags().catch(() => []),
    listTours({ isPublished: true, pageSize: 100 })
      .then((r) => r.data.map((t) => ({ slug: t.slug, title: t.title })))
      .catch(() => []),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 lg:px-6">
      <div className="space-y-3">
        <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/posts" />}>
          <ArrowLeft data-icon="inline-start" />
          Back to posts
        </Button>
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-bold">New post</h1>
          <p className="text-muted-foreground text-sm">
            Write an editorial post. It starts as a draft unless you publish it.
          </p>
        </div>
      </div>

      <PostForm action={createPost} submitLabel="Create post" tagSuggestions={tagSuggestions} tourOptions={tourOptions} />
    </div>
  );
}
