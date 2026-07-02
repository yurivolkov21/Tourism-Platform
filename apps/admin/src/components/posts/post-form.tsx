'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';

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
} from '@tourism/ui';

import type { PostFormState } from '../../lib/posts/actions';
import { POST_STATUSES } from '../../lib/posts/schema';
import type { Post } from '../../lib/posts/data';
import { slugify } from '../../lib/slugify';
import { ErrorAlert } from '../crud/error-alert';

interface PostFormProps {
  action: (prev: PostFormState, formData: FormData) => Promise<PostFormState>;
  post?: Post;
  submitLabel: string;
}

/** `PUBLISHED` → `Published`. */
const labelize = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

/**
 * Create/edit form for a post — shadcn "Form Layout 2" (sectioned: a left title/description column
 * beside the fields), matching the other admin forms. Field names are unchanged, so the zod schema
 * + server actions stay as-is.
 */
export function PostForm({ action, post, submitLabel }: PostFormProps) {
  const [state, formAction, pending] = useActionState<PostFormState, FormData>(action, {});
  const errors = state.fieldErrors ?? {};

  const [title, setTitle] = useState(post?.title ?? '');
  const [slug, setSlug] = useState(post?.slug ?? '');
  // On edit the slug is pre-set → treat as user-owned so editing the title doesn't clobber the URL.
  const [slugEdited, setSlugEdited] = useState(Boolean(post?.slug));
  const [status, setStatus] = useState<string>(post?.status ?? 'DRAFT');

  return (
    <form action={formAction}>
      {/* Basics */}
      <FieldSet className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div>
          <FieldLegend className="mb-1.5 font-semibold">Basics</FieldLegend>
          <FieldDescription>The public title, its URL slug, and the card teaser.</FieldDescription>
        </div>
        <FieldGroup className="grid grid-cols-1 gap-6 md:col-span-2">
          <Field data-invalid={Boolean(errors.title)}>
            <FieldLabel htmlFor="title">Title</FieldLabel>
            <Input
              id="title"
              name="title"
              required
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
              Auto-generated from the title. Edit it only for a custom URL — lowercase, words
              separated by hyphens.
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

      {/* Content */}
      <FieldSet className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div>
          <FieldLegend className="mb-1.5 font-semibold">Content</FieldLegend>
          <FieldDescription>The post body in Markdown — headings, bold, lists, links.</FieldDescription>
        </div>
        <FieldGroup className="grid grid-cols-1 gap-6 md:col-span-2">
          <Field data-invalid={Boolean(errors.content)}>
            <FieldLabel htmlFor="content">Body</FieldLabel>
            <Textarea
              id="content"
              name="content"
              rows={16}
              maxLength={50000}
              required
              defaultValue={post?.content ?? ''}
              placeholder={'## A heading\n\nWrite the post in Markdown…'}
              className="font-mono text-[0.8rem] leading-relaxed"
              aria-invalid={Boolean(errors.content)}
            />
            <FieldDescription>Markdown — rendered (sanitized) on the public site.</FieldDescription>
            {errors.content ? <FieldError>{errors.content}</FieldError> : null}
          </Field>
        </FieldGroup>
      </FieldSet>

      <Separator className="my-8" />

      {/* Publishing */}
      <FieldSet className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div>
          <FieldLegend className="mb-1.5 font-semibold">Publishing</FieldLegend>
          <FieldDescription>Only published posts appear on the site.</FieldDescription>
        </div>
        <FieldGroup className="grid grid-cols-1 gap-6 md:col-span-2">
          <Field>
            <FieldLabel htmlFor="status">Status</FieldLabel>
            <Select value={status} onValueChange={(v) => setStatus(v ?? 'DRAFT')}>
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
              Publishing stamps the publish date; only published posts are public.
            </FieldDescription>
          </Field>
        </FieldGroup>
      </FieldSet>

      {state.error ? (
        <div className="mt-6">
          <ErrorAlert>{state.error}</ErrorAlert>
        </div>
      ) : null}

      <div className="mt-8 flex items-center justify-end gap-3">
        <Button type="button" variant="outline" nativeButton={false} render={<Link href="/posts" />}>
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
