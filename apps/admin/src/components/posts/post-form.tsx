'use client';

import Link from 'next/link';
import { useActionState } from 'react';

import {
  Button,
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  Input,
  Textarea,
} from '@tourism/ui';

import type { PostFormState } from '../../lib/posts/actions';
import { POST_STATUSES } from '../../lib/posts/schema';
import type { Post } from '../../lib/posts/data';

interface PostFormProps {
  action: (prev: PostFormState, formData: FormData) => Promise<PostFormState>;
  post?: Post;
  submitLabel: string;
}

const SELECT_CLASS =
  'border-input bg-background h-9 w-full max-w-xs rounded-lg border px-2.5 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50';

const labelize = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

export function PostForm({ action, post, submitLabel }: PostFormProps) {
  const [state, formAction, pending] = useActionState<PostFormState, FormData>(action, {});
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6">
      <FieldGroup>
        <Field data-invalid={Boolean(errors.title)}>
          <FieldLabel htmlFor="title">Title</FieldLabel>
          <Input id="title" name="title" required maxLength={160} defaultValue={post?.title ?? ''} placeholder="Three perfect days in Hội An" aria-invalid={Boolean(errors.title)} />
          {errors.title ? <FieldError>{errors.title}</FieldError> : null}
        </Field>

        <Field data-invalid={Boolean(errors.slug)}>
          <FieldLabel htmlFor="slug">Slug</FieldLabel>
          <Input id="slug" name="slug" maxLength={80} defaultValue={post?.slug ?? ''} placeholder="three-perfect-days-in-hoi-an" aria-invalid={Boolean(errors.slug)} />
          <FieldDescription>Leave blank to generate one from the title.</FieldDescription>
          {errors.slug ? <FieldError>{errors.slug}</FieldError> : null}
        </Field>

        <Field data-invalid={Boolean(errors.excerpt)}>
          <FieldLabel htmlFor="excerpt">Excerpt</FieldLabel>
          <Textarea id="excerpt" name="excerpt" rows={2} maxLength={300} defaultValue={post?.excerpt ?? ''} placeholder="A short teaser shown on the blog card." aria-invalid={Boolean(errors.excerpt)} />
          {errors.excerpt ? <FieldError>{errors.excerpt}</FieldError> : null}
        </Field>

        <Field data-invalid={Boolean(errors.content)}>
          <FieldLabel htmlFor="content">Content</FieldLabel>
          <Textarea id="content" name="content" rows={16} maxLength={50000} required defaultValue={post?.content ?? ''} placeholder="Write the post in Markdown…" className="font-mono text-[0.8rem] leading-relaxed" aria-invalid={Boolean(errors.content)} />
          <FieldDescription>Markdown — rendered (sanitized) on the public site.</FieldDescription>
          {errors.content ? <FieldError>{errors.content}</FieldError> : null}
        </Field>

        <Field>
          <FieldLabel htmlFor="status">Status</FieldLabel>
          <select id="status" name="status" defaultValue={post?.status ?? 'DRAFT'} className={SELECT_CLASS}>
            {POST_STATUSES.map((s) => (
              <option key={s} value={s}>
                {labelize(s)}
              </option>
            ))}
          </select>
          <FieldDescription>Publishing stamps the publish date; only published posts are public.</FieldDescription>
        </Field>
      </FieldGroup>

      {state.error ? (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : submitLabel}
        </Button>
        <Button type="button" variant="ghost" nativeButton={false} render={<Link href="/posts" />}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default PostForm;
