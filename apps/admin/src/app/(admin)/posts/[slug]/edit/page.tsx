import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@tourism/ui';

import { PostForm } from '../../../../../components/posts/post-form';
import { updatePost } from '../../../../../lib/posts/actions';
import { getPost, type Post } from '../../../../../lib/posts/data';

interface EditPostPageProps {
  params: Promise<{ slug: string }>;
}

export default async function EditPostPage({ params }: EditPostPageProps) {
  const { slug } = await params;

  let post: Post;
  try {
    post = await getPost(slug);
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

      <PostForm action={action} post={post} submitLabel="Save changes" />
    </div>
  );
}
