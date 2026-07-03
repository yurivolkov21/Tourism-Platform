import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@tourism/ui';

import { PostForm } from '../../../../../components/posts/post-form';
import { updatePost } from '../../../../../lib/posts/actions';
import { getPost, type Post, listPostTags } from '../../../../../lib/posts/data';
import { listTours } from '../../../../../lib/tours/data';

interface EditPostPageProps {
  params: Promise<{ slug: string }>;
}

export default async function EditPostPage({ params }: EditPostPageProps) {
  const { slug } = await params;

  let post: Post;
  let tagSuggestions;
  let tourOptions;
  try {
    [post, tagSuggestions, tourOptions] = await Promise.all([
      getPost(slug),
      listPostTags().catch(() => []),
      listTours({ isPublished: true, pageSize: 100 })
        .then((r) => r.data.map((t) => ({ slug: t.slug, title: t.title })))
        .catch(() => []),
    ]);
  } catch {
    notFound();
  }

  const action = updatePost.bind(null, slug);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 lg:px-6">
      <div className="space-y-3">
        <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/posts" />}>
          <ArrowLeft data-icon="inline-start" />
          Back to posts
        </Button>
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-bold">Edit post</h1>
          <p className="text-muted-foreground text-sm">{post.title}</p>
        </div>
      </div>

      <PostForm action={action} post={post} submitLabel="Save changes" tagSuggestions={tagSuggestions} tourOptions={tourOptions} />
    </div>
  );
}
