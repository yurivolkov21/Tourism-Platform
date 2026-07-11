'use client';

import Link from 'next/link';
import { useActionState, useEffect, useRef, useState } from 'react';

import {
  Button,
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Textarea,
  cn,
} from '@tourism/ui';

import type { PostFormState } from '../../lib/posts/actions';
import {
  isoToLocalDatetimeInput,
  localDatetimeToIso,
  POST_STATUSES,
} from '../../lib/posts/schema';
import type { Post, PostTagOption } from '../../lib/posts/data';
import { slugify } from '../../lib/slugify';
import { MediaField } from '../crud/media-field';
import type { MediaInput } from '../../lib/media';
import { ErrorAlert } from '../crud/error-alert';
import { TagsInput } from './tags-input';
import { RelatedToursPicker } from './related-tours-picker';
import { InsertImageButton } from './insert-image-button';
import { PostContent } from './post-content';
import { insertSnippet } from '../../lib/posts/markdown';

interface PostFormProps {
  action: (prev: PostFormState, formData: FormData) => Promise<PostFormState>;
  post?: Post & {
    relatedTours?: { slug: string; title: string; isPublished: boolean }[];
  };
  submitLabel: string;
  /** Existing tags for suggestions (admin tag list). */
  tagSuggestions?: PostTagOption[];
  /** Published tours offered by the related-tours picker. */
  tourOptions?: { slug: string; title: string }[];
}

/** `PUBLISHED` → `Published`. */
const labelize = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

/**
 * Create/edit form for a post — shadcn "Form Layout 2" (sectioned: a left title/description column
 * beside the fields), matching the other admin forms. Field names are unchanged, so the zod schema
 * + server actions stay as-is.
 */
export function PostForm({
  action,
  post,
  submitLabel,
  tagSuggestions = [],
  tourOptions = [],
}: PostFormProps) {
  const [state, formAction, pending] = useActionState<PostFormState, FormData>(
    action,
    {},
  );
  const errors = state.fieldErrors ?? {};

  const [title, setTitle] = useState(post?.title ?? '');
  const [slug, setSlug] = useState(post?.slug ?? '');
  // On edit the slug is pre-set → treat as user-owned so editing the title doesn't clobber the URL.
  const [slugEdited, setSlugEdited] = useState(Boolean(post?.slug));
  const [status, setStatus] = useState<string>(post?.status ?? 'DRAFT');
  const [metaTitle, setMetaTitle] = useState(post?.metaTitle ?? '');
  const [metaDescription, setMetaDescription] = useState(
    post?.metaDescription ?? '',
  );
  // Seeded CLIENT-SIDE ONLY (mount effect): the ISO→local conversion must run in the
  // browser's timezone — during SSR it would use the server's (UTC on Vercel), seeding
  // the wrong wall-clock time AND causing a hydration mismatch on the controlled input.
  // The one-frame empty flash is accepted (same trade-off as the column-prefs hook).
  const [publishedAt, setPublishedAt] = useState('');
  useEffect(() => {
    setPublishedAt(isoToLocalDatetimeInput(post?.publishedAt ?? null));
  }, []);

  // Seed the cover from the existing post on edit (hero role only; guard: media may be absent
  // for a beat mid-deploy while the API still serves the old shape).
  const initialMedia: MediaInput[] = (post?.media ?? [])
    .filter((m) => m.role === 'hero' && m.publicId)
    .map((m) => ({
      publicId: m.publicId,
      role: 'hero' as const,
      width: m.width ?? undefined,
      height: m.height ?? undefined,
      url: m.url,
    }));
  const [media, setMedia] = useState<MediaInput[]>(initialMedia);

  const [tags, setTags] = useState<string[]>(
    (post?.tags ?? []).map((t) => t.name),
  );
  const [relatedSlugs, setRelatedSlugs] = useState<string[]>(
    (post?.relatedTours ?? []).map((t) => t.slug),
  );

  // Body markdown is controlled so the insert-image button can splice at the caret and the
  // Preview tab can render live; a hidden input carries `name="content"` (the Textarea
  // unmounts on preview, which would otherwise drop the field from the form post).
  const [content, setContent] = useState(post?.content ?? '');
  const [editorTab, setEditorTab] = useState<'write' | 'preview'>('write');
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const handleInsertImage = (url: string) => {
    const cursor = contentRef.current?.selectionStart ?? content.length;
    const { next, nextCursor } = insertSnippet(content, cursor, `![](${url})`);
    setContent(next);
    setEditorTab('write');
    requestAnimationFrame(() => {
      contentRef.current?.focus();
      contentRef.current?.setSelectionRange(nextCursor, nextCursor);
    });
  };

  return (
    <form action={formAction} noValidate>
      {/* Basics */}
      <FieldSet className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div>
          <FieldLegend className="mb-1.5 font-semibold">Basics</FieldLegend>
          <FieldDescription>
            The public title, its URL slug, and the card teaser.
          </FieldDescription>
        </div>
        <FieldGroup className="grid grid-cols-1 gap-6 md:col-span-2">
          <Field data-invalid={Boolean(errors.title)}>
            <FieldLabel htmlFor="title">Title</FieldLabel>
            <Input
              id="title"
              name="title"
              aria-required="true"
              maxLength={160}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (!slugEdited) setSlug(slugify(e.target.value));
              }}
              placeholder="Three perfect days in Hội An"
              aria-invalid={Boolean(errors.title)}
            />
            {errors.title ? <FieldError>{errors.title}</FieldError> : null}
          </Field>
          <Field data-invalid={Boolean(errors.slug)}>
            <FieldLabel htmlFor="slug">Slug</FieldLabel>
            <Input
              id="slug"
              name="slug"
              maxLength={80}
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugEdited(true);
              }}
              placeholder="three-perfect-days-in-hoi-an"
              aria-invalid={Boolean(errors.slug)}
            />
            <FieldDescription>
              Auto-generated from the title. Edit it only for a custom URL —
              lowercase, words separated by hyphens.
            </FieldDescription>
            {errors.slug ? <FieldError>{errors.slug}</FieldError> : null}
          </Field>
          <Field data-invalid={Boolean(errors.excerpt)}>
            <FieldLabel htmlFor="excerpt">Excerpt</FieldLabel>
            <Textarea
              id="excerpt"
              name="excerpt"
              rows={2}
              maxLength={300}
              defaultValue={post?.excerpt ?? ''}
              placeholder="A short teaser shown on the blog card."
              aria-invalid={Boolean(errors.excerpt)}
            />
            {errors.excerpt ? <FieldError>{errors.excerpt}</FieldError> : null}
          </Field>
        </FieldGroup>
      </FieldSet>

      <Separator className="my-8" />

      {/* Cover */}
      <MediaField
        initial={media}
        onChange={setMedia}
        heroPurpose="POST_COVER"
        legend="Cover"
        description="One wide photo for the blog card and the post header."
        heroLabel="Cover image"
      />
      <input type="hidden" name="media" value={JSON.stringify(media)} />

      <input type="hidden" name="tags" value={JSON.stringify(tags)} />
      <input
        type="hidden"
        name="relatedTourSlugs"
        value={JSON.stringify(relatedSlugs)}
      />

      <Separator className="my-8" />

      {/* Content */}
      <FieldSet className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div>
          <FieldLegend className="mb-1.5 font-semibold">Content</FieldLegend>
          <FieldDescription>
            The post body in Markdown — headings, bold, lists, links.
          </FieldDescription>
        </div>
        <FieldGroup className="grid grid-cols-1 gap-6 md:col-span-2">
          <Field data-invalid={Boolean(errors.content)}>
            <FieldLabel htmlFor="content">Body</FieldLabel>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div
                role="tablist"
                className="bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-1"
              >
                {(['write', 'preview'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={editorTab === tab}
                    onClick={() => setEditorTab(tab)}
                    className={cn(
                      'inline-flex h-7 cursor-pointer items-center rounded-md px-3 text-sm font-medium capitalize transition-colors',
                      editorTab === tab
                        ? 'bg-background text-foreground shadow-sm'
                        : 'hover:text-foreground',
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <InsertImageButton
                slug={post?.slug}
                onInsert={handleInsertImage}
              />
            </div>
            {editorTab === 'write' ? (
              <Textarea
                ref={contentRef}
                id="content"
                rows={16}
                maxLength={50000}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={'## A heading\n\nWrite the post in Markdown…'}
                className="font-mono text-[0.8rem] leading-relaxed"
                aria-invalid={Boolean(errors.content)}
              />
            ) : (
              <div className="border-border/60 bg-muted/30 min-h-64 rounded-lg border p-4">
                <PostContent markdown={content} />
              </div>
            )}
            <input type="hidden" name="content" value={content} />
            <FieldDescription>
              Markdown — rendered (sanitized) on the public site.
            </FieldDescription>
            {errors.content ? <FieldError>{errors.content}</FieldError> : null}
          </Field>
        </FieldGroup>
      </FieldSet>

      <Separator className="my-8" />

      {/* Topics & related tours */}
      <FieldSet className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div>
          <FieldLegend className="mb-1.5 font-semibold">
            Topics &amp; tours
          </FieldLegend>
          <FieldDescription>
            Tags group stories on the journal; related tours appear under the
            article.
          </FieldDescription>
        </div>
        <FieldGroup className="grid grid-cols-1 gap-6 md:col-span-2">
          <Field data-invalid={Boolean(errors.tags)}>
            <FieldLabel>Tags</FieldLabel>
            <TagsInput
              value={tags}
              onChange={setTags}
              suggestions={tagSuggestions}
            />
            <FieldDescription>
              Up to 10 — pick existing topics or type a new one and press Enter.
            </FieldDescription>
            {errors.tags ? <FieldError>{errors.tags}</FieldError> : null}
          </Field>
          <Field data-invalid={Boolean(errors.relatedTourSlugs)}>
            <FieldLabel>Related tours</FieldLabel>
            <RelatedToursPicker
              value={relatedSlugs}
              onChange={setRelatedSlugs}
              options={tourOptions}
            />
            <FieldDescription>
              Up to 3 tours to feature under this story.
            </FieldDescription>
            {errors.relatedTourSlugs ? (
              <FieldError>{errors.relatedTourSlugs}</FieldError>
            ) : null}
          </Field>
        </FieldGroup>
      </FieldSet>

      <Separator className="my-8" />

      {/* SEO */}
      <FieldSet className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div>
          <FieldLegend className="mb-1.5 font-semibold">SEO</FieldLegend>
          <FieldDescription>
            Overrides for search results and social shares. Falls back to the
            title/excerpt when left blank.
          </FieldDescription>
        </div>
        <FieldGroup className="grid grid-cols-1 gap-6 md:col-span-2">
          <Field data-invalid={Boolean(errors.metaTitle)}>
            <div className="flex items-baseline justify-between gap-2">
              <FieldLabel htmlFor="metaTitle">Meta title</FieldLabel>
              <span className="text-muted-foreground text-xs tabular-nums">
                {metaTitle.length}/70
              </span>
            </div>
            <Input
              id="metaTitle"
              name="metaTitle"
              maxLength={70}
              value={metaTitle}
              onChange={(e) => setMetaTitle(e.target.value)}
              placeholder="Hội An in 3 days — itinerary"
              aria-invalid={Boolean(errors.metaTitle)}
            />
            {errors.metaTitle ? (
              <FieldError>{errors.metaTitle}</FieldError>
            ) : null}
          </Field>
          <Field data-invalid={Boolean(errors.metaDescription)}>
            <div className="flex items-baseline justify-between gap-2">
              <FieldLabel htmlFor="metaDescription">
                Meta description
              </FieldLabel>
              <span className="text-muted-foreground text-xs tabular-nums">
                {metaDescription.length}/160
              </span>
            </div>
            <Textarea
              id="metaDescription"
              name="metaDescription"
              rows={2}
              maxLength={160}
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              placeholder="A one-sentence summary shown in search results."
              aria-invalid={Boolean(errors.metaDescription)}
            />
            {errors.metaDescription ? (
              <FieldError>{errors.metaDescription}</FieldError>
            ) : null}
          </Field>
        </FieldGroup>
      </FieldSet>

      <Separator className="my-8" />

      {/* Publishing */}
      <FieldSet className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div>
          <FieldLegend className="mb-1.5 font-semibold">Publishing</FieldLegend>
          <FieldDescription>
            Only published posts appear on the site.
          </FieldDescription>
        </div>
        <FieldGroup className="grid grid-cols-1 gap-6 md:col-span-2">
          <Field>
            <FieldLabel htmlFor="status">Status</FieldLabel>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v ?? 'DRAFT')}
            >
              <SelectTrigger id="status" className="w-full max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start" alignItemWithTrigger={false}>
                {POST_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {labelize(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" name="status" value={status} />
            <FieldDescription>
              Publishing stamps the publish date; only published posts are
              public.
            </FieldDescription>
          </Field>
          {status === 'PUBLISHED' ? (
            <Field data-invalid={Boolean(errors.publishedAt)}>
              <FieldLabel htmlFor="publishedAt">Publish date</FieldLabel>
              {/* The visible input is NOT submitted — the hidden field carries the ISO
                  instant computed HERE in the browser's timezone. Converting the bare
                  local string on the server would apply the server's timezone and
                  shift the schedule (adversarial-review finding). */}
              <Input
                id="publishedAt"
                type="datetime-local"
                className="max-w-xs"
                value={publishedAt}
                onChange={(e) => setPublishedAt(e.target.value)}
                aria-invalid={Boolean(errors.publishedAt)}
              />
              <input
                type="hidden"
                name="publishedAtIso"
                value={
                  publishedAt ? (localDatetimeToIso(publishedAt) ?? '') : ''
                }
              />
              <FieldDescription>
                Leave empty to publish immediately; a future date schedules the
                post. Times are in your local timezone.
              </FieldDescription>
              {errors.publishedAt ? (
                <FieldError>{errors.publishedAt}</FieldError>
              ) : null}
            </Field>
          ) : null}
        </FieldGroup>
      </FieldSet>

      {state.error ? (
        <div className="mt-6">
          <ErrorAlert>{state.error}</ErrorAlert>
        </div>
      ) : null}

      <div className="mt-8 flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          nativeButton={false}
          render={<Link href="/posts" />}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}

export default PostForm;
