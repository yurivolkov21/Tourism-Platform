import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@tourism/ui';

import { PostForm } from '../../../../components/posts/post-form';
import { createPost } from '../../../../lib/posts/actions';

export default function NewPostPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
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

      <PostForm action={createPost} submitLabel="Create post" />
    </div>
  );
}
