import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { ArrowLeft, Pencil } from 'lucide-react';

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@tourism/ui';

import { LinkedToursCard } from '../../../../components/crud/linked-tours-card';
import { DestinationMediaView } from '../../../../components/destinations/destination-media-view';
import { RowActions } from '../../../../components/crud/row-actions';
import { PostContent } from '../../../../components/posts/post-content';
import { deletePost } from '../../../../lib/posts/actions';
import { extractOutline, readingStats } from '../../../../lib/posts/derive';
import { getPost, type PostDetail } from '../../../../lib/posts/data';
import { formatRelativeTime } from '../../../../lib/relative-time';

interface PostDetailPageProps {
  params: Promise<{ slug: string }>;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
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

/** Absolute date + relative-time suffix for the rail. */
function When({ iso }: { iso: string }) {
  return (
    <span className="font-normal">
      {formatDate(iso)}
      <span className="text-muted-foreground ml-1.5 text-xs">
        {formatRelativeTime(iso)}
      </span>
    </span>
  );
}

export default async function PostDetailPage({ params }: PostDetailPageProps) {
  const { slug } = await params;

  let post: PostDetail;
  try {
    post = await getPost(slug);
  } catch {
    notFound();
  }

  const isPublished = post.status === 'PUBLISHED';
  const stats = readingStats(post.content);
  const outline = extractOutline(post.content);
  const authorInitials = (post.author?.fullName ?? post.author?.email ?? 'AD')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 lg:px-6">
      <Link
        href="/posts"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-4" />
        Back to posts
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-2xl font-bold tracking-tight">
              {post.title}
            </h1>
            <Badge
              variant={isPublished ? 'default' : 'secondary'}
              className="gap-1.5"
            >
              <span
                className="size-1.5 rounded-full bg-current opacity-70"
                aria-hidden
              />
              {isPublished ? 'Published' : 'Draft'}
            </Badge>
          </div>
          {post.excerpt ? (
            <p className="text-muted-foreground text-sm">{post.excerpt}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/posts/${post.slug}/edit`} />}
          >
            <Pencil data-icon="inline-start" />
            Edit
          </Button>
          <RowActions
            editHref={`/posts/${post.slug}/edit`}
            deleteAction={deletePost}
            deleteId={post.slug}
            deleteTitle={`Delete "${post.title}"?`}
            deleteDescription="This permanently deletes the post and can't be undone."
            redirectTo="/posts"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cover</CardTitle>
            </CardHeader>
            <CardContent>
              <DestinationMediaView
                media={(post.media ?? [])
                  .filter((m) => m.url)
                  .map((m) => ({ url: m.url, role: m.role }))}
                emptyText="No cover yet — add one from Edit."
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Content</CardTitle>
            </CardHeader>
            <CardContent>
              <PostContent markdown={post.content} />
            </CardContent>
          </Card>
        </div>

        {/* Rail */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <Row
                  label="Status"
                  value={isPublished ? 'Published' : 'Draft'}
                />
                <Row
                  label="Slug"
                  value={<code className="text-xs">{post.slug}</code>}
                />
                {(post.tags ?? []).length > 0 ? (
                  <Row
                    label="Tags"
                    value={
                      <span className="flex flex-wrap justify-end gap-1">
                        {(post.tags ?? []).map((t) => (
                          <Badge
                            key={t.slug}
                            variant="outline"
                            className="text-xs"
                          >
                            {t.name}
                          </Badge>
                        ))}
                      </span>
                    }
                  />
                ) : null}
                {stats.words > 0 ? (
                  <Row
                    label="Length"
                    value={
                      <span className="font-normal">
                        {stats.words.toLocaleString('en-US')} words
                        <span className="text-muted-foreground ml-1.5 text-xs">
                          ~{stats.minutes} min read
                        </span>
                      </span>
                    }
                  />
                ) : null}
                <Row
                  label="Author"
                  value={
                    <span className="flex items-center justify-end gap-2 font-normal">
                      <Avatar className="size-7 rounded-lg">
                        {post.author?.avatarUrl ? (
                          <AvatarImage src={post.author.avatarUrl} alt="" />
                        ) : null}
                        <AvatarFallback className="rounded-lg text-[10px]">
                          {authorInitials}
                        </AvatarFallback>
                      </Avatar>
                      <span>
                        {post.author?.fullName ?? '—'}
                        <span className="text-muted-foreground block text-xs">
                          {post.author?.email ?? ''}
                        </span>
                      </span>
                    </span>
                  }
                />
                <Row
                  label="Published"
                  value={
                    post.publishedAt ? <When iso={post.publishedAt} /> : '—'
                  }
                />
                <Row label="Created" value={<When iso={post.createdAt} />} />
                <Row label="Updated" value={<When iso={post.updatedAt} />} />
              </dl>
            </CardContent>
          </Card>
          <LinkedToursCard
            tours={post.relatedTours ?? []}
            title="Related tours"
            emptyText="No tours linked — pick up to 3 from Edit."
          />
          {outline.length >= 2 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">In this post</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5 text-sm">
                  {outline.map((h, i) => (
                    <li
                      key={`${h.text}-${i}`}
                      className={
                        h.depth === 3
                          ? 'text-muted-foreground pl-4'
                          : 'font-medium'
                      }
                    >
                      {h.text}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
