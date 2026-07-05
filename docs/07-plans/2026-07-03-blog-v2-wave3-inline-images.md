# Blog v2 Wave 3 — Inline Body Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin inserts uploaded images into the post markdown from the Content section
(edit only), with a Write|Preview toggle; body images are tracked as POST-owned
`MediaAsset` role `body`, survive the cover's replace-all, and are garbage-collected on
post delete.

**Architecture:** Slice 1 (BE, branch `feat/blog-v2-body-images`): `MediaRole.body` enum
migration (user-gated deploy) · `syncAssets` gains `preserveRoles` carve-out ·
`UploadPurpose.POST_BODY` · `MediaService.registerAsset` + `POST /admin/posts/:slug/body-images`
(idempotent) · regen. Slice 2 (admin FE, branch `feat/blog-v2-body-images-ui`): pure
`insertSnippet` helper (TDD) · controlled Content textarea + Write|Preview toggle +
Insert-image button (edit-only) · `/media` role facet gains `body`.

**Tech Stack:** NestJS 11 · Prisma 7 enum migration · Cloudinary direct upload (existing
signed flow) · Next.js 16 admin · Jest.

**Spec:** `docs/06-specs/2026-07-03-blog-v2-wave3-inline-images-design.md` (user decision:
track + GC-on-delete).

## Global Constraints

- Straight ASCII quotes; NEVER reformat lines a step doesn't name (haiku incident on W2).
- Never stage unrelated dirty files (`docs/07-plans/2026-07-02-*.md`, `playground.md`).
- Conventional Commits, no AI attribution.
- Gate per slice: `pnpm nx affected -t lint test build --exclude=@tourism/mobile`.
  Baselines: api 301 · admin 139 · web 155.
- **Migration gate:** generate with `--create-only`; `prisma migrate deploy` ONLY after the
  user's GO (Task 5); merge only after the migration is applied (code writes `body`).
- `syncAssets` default behavior (no opts) must stay byte-identical — existing callers and
  the whole media.service.spec suite are the regression net.
- Admin design consistency: segmented tablist styling for Write|Preview (the outbox/media
  tab pattern); Spinner-in-button while uploading; `ErrorAlert` for failures.

---

## Slice 1 — BE (branch `feat/blog-v2-body-images`)

### Task 1: `MediaRole.body` enum + migration (create-only)

**Files:**

- Modify: `apps/api/prisma/schema.prisma` (enum `MediaRole`, ~line 68)
- Create: `apps/api/prisma/migrations/<ts>_add_media_role_body/migration.sql` (generated)

- [ ] **Step 1: Branch**

```bash
git checkout main && git pull && git checkout -b feat/blog-v2-body-images
```

- [ ] **Step 2: Edit the enum**

```prisma
enum MediaRole {
  hero
  gallery
  avatar
  body
}
```

- [ ] **Step 3: Generate WITHOUT applying + regenerate client**

```bash
cd apps/api
pnpm exec prisma migrate dev --create-only --name add_media_role_body
pnpm exec prisma generate
```

Expected migration.sql: `ALTER TYPE "MediaRole" ADD VALUE 'body';` and NOTHING else. If any
prompt about drift/reset appears — abort and report BLOCKED (live DB).

- [ ] **Step 4: Verify + commit**

Run: `pnpm nx run @tourism/api:typecheck` → green.

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations
git commit -m "feat(api): MediaRole.body enum (migration create-only, not applied)"
```

### Task 2: `syncAssets` preserveRoles carve-out + `POST_BODY` purpose (TDD)

**Files:**

- Modify: `apps/api/src/modules/media/media.service.ts`
- Modify: `apps/api/src/modules/media/media.service.spec.ts`
- Modify: `apps/api/src/modules/posts/posts.service.ts` (`setMedia` passes the carve-out)
- Modify: `apps/api/src/modules/posts/posts.service.spec.ts`
- Modify: `apps/api/src/modules/uploads/dto/create-signed-upload-url.dto.ts`
- Modify: `apps/api/src/modules/uploads/uploads.service.ts`
- Modify: `apps/api/src/modules/uploads/uploads.service.spec.ts`

**Interfaces:**

- Produces: `syncAssets(tx, ownerType, ownerId, assets, opts?: { preserveRoles?: MediaRole[] })`
  — when provided, the existing-read AND the `deleteMany` add `role: { notIn: opts.preserveRoles }`;
  `UploadPurpose.POST_BODY` (image, folder `posts/body`).

- [ ] **Step 1: Failing tests — media.service.spec.ts** (follow the file's existing
  harness/stubs; the new cases):

```ts
  it('syncAssets with preserveRoles excludes those roles from read and delete', async () => {
    const tx = makeTx(); // the file's existing tx stub factory
    await makeService({}).syncAssets(tx, MediaOwnerType.POST, 'p1', [], {
      preserveRoles: [MediaRole.body],
    });
    expect(tx.mediaAsset.findMany.mock.calls[0][0].where).toEqual({
      ownerType: MediaOwnerType.POST,
      ownerId: 'p1',
      role: { notIn: [MediaRole.body] },
    });
    expect(tx.mediaAsset.deleteMany.mock.calls[0][0].where).toEqual({
      ownerType: MediaOwnerType.POST,
      ownerId: 'p1',
      role: { notIn: [MediaRole.body] },
    });
  });

  it('syncAssets without opts keeps the legacy whole-owner where-clause', async () => {
    const tx = makeTx();
    await makeService({}).syncAssets(tx, MediaOwnerType.TOUR, 't1', []);
    expect(tx.mediaAsset.findMany.mock.calls[0][0].where).toEqual({
      ownerType: MediaOwnerType.TOUR,
      ownerId: 't1',
    });
  });
```

(Adapt stub-factory names to the file — `makeService`/tx helpers already exist there.)

- [ ] **Step 2: Implement the carve-out** in `media.service.ts`:

```ts
  async syncAssets(
    tx: Prisma.TransactionClient,
    ownerType: MediaOwnerType,
    ownerId: string,
    assets: MediaInputDto[],
    opts?: { preserveRoles?: MediaRole[] },
  ): Promise<void> {
    const where: Prisma.MediaAssetWhereInput = {
      ownerType,
      ownerId,
      ...(opts?.preserveRoles?.length ? { role: { notIn: opts.preserveRoles } } : {}),
    };
    const existing = await tx.mediaAsset.findMany({
      where,
      select: { publicId: true, posterId: true, type: true },
    });
    const keptIds = new Set(assets.map((a) => a.publicId));
    await this.recordGarbage(
      tx,
      existing.filter((e) => !keptIds.has(e.publicId)),
    );

    await tx.mediaAsset.deleteMany({ where });
    if (assets.length === 0) return;
    // ... createMany block unchanged ...
  }
```

(`MediaRole` joins the `@prisma/client` import. The doc comment gains one line: body-role
rows can be preserved through the cover's replace-all via `opts.preserveRoles`.)

- [ ] **Step 3: `PostsService.setMedia` passes the carve-out** (posts.service.ts):

```ts
    await this.prisma.$transaction((tx) =>
      this.media.syncAssets(tx, MediaOwnerType.POST, post.id, media, {
        preserveRoles: [MediaRole.body],
      }),
    );
```

(`MediaRole` joins the `@prisma/client` import.) Add a posts.service.spec case asserting the
5th argument:

```ts
  it('setMedia preserves body-role assets through the replace-all', async () => {
    const findUnique = jest.fn().mockResolvedValue({ id: 'p1' });
    const syncAssets = jest.fn().mockResolvedValue(undefined);
    const media = makeMedia({ syncAssets });
    const svc = makeSvc(makePrisma({ findUnique }), media, makeTours());

    await svc.setMedia('p', []);

    expect(syncAssets.mock.calls[0][4]).toEqual({ preserveRoles: [MediaRole.body] });
  });
```

(`MediaRole` joins the spec's `@prisma/client` import.)

- [ ] **Step 4: `POST_BODY` purpose** — `create-signed-upload-url.dto.ts` enum gains
  `POST_BODY = 'POST_BODY',`; `uploads.service.ts` switches gain
  `case UploadPurpose.POST_BODY:` → `'image'` (grouped with POST_COVER) and
  `` return `${this.rootFolder}/posts/body`; ``. Spec case (mirror the POST_COVER test):

```ts
  it('signs a POST_BODY upload into the posts/body folder', async () => {
    const out = await makeService().createSignedUploadUrl(
      body({ purpose: UploadPurpose.POST_BODY, filename: 'shot.jpg' }),
    );
    expect(out.folder).toBe('tourism/posts/body');
    expect(out.resourceType).toBe('image');
  });
```

(Adapt the assertion helpers/rootFolder literal to the file's existing tests.)

- [ ] **Step 5: Run + commit**

Run: `pnpm nx test @tourism/api --testPathPatterns="media.service|posts.service|uploads.service"`
→ all green. Then full: `pnpm nx test @tourism/api` (record count).

```bash
git add apps/api/src/modules/media apps/api/src/modules/posts apps/api/src/modules/uploads
git commit -m "feat(api): syncAssets preserveRoles carve-out + POST_BODY upload purpose"
```

### Task 3: register endpoint (TDD)

**Files:**

- Create: `apps/api/src/modules/posts/dto/register-body-image.dto.ts`
- Modify: `apps/api/src/modules/media/media.service.ts` (`registerAsset`)
- Modify: `apps/api/src/modules/media/media.service.spec.ts`
- Modify: `apps/api/src/modules/posts/posts.service.ts` (`addBodyImage`)
- Modify: `apps/api/src/modules/posts/posts.service.spec.ts`
- Modify: `apps/api/src/modules/posts/admin-posts.controller.ts`

**Interfaces:**

- Produces: `MediaService.registerAsset(ownerType, ownerId, role, input): Promise<{ url: string }>`
  (idempotent per owner+publicId) · `PostsService.addBodyImage(slug, dto)` ·
  `POST /admin/posts/:slug/body-images` → `{ url }` (201; 404 unknown slug).

- [ ] **Step 1: DTO** — `register-body-image.dto.ts`:

```ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

/** Registers an already-uploaded Cloudinary image as a post BODY asset (markdown insert). */
export class RegisterBodyImageDto {
  @ApiProperty({ example: 'tourism/posts/body/1717000000000-boat', maxLength: 300 })
  @IsString()
  @Length(1, 300)
  publicId!: string;

  @ApiPropertyOptional({ example: 1600 })
  @IsOptional()
  @IsInt()
  @Min(1)
  width?: number;

  @ApiPropertyOptional({ example: 900 })
  @IsOptional()
  @IsInt()
  @Min(1)
  height?: number;

  @ApiPropertyOptional({ example: 'jpg', maxLength: 10 })
  @IsOptional()
  @IsString()
  @Length(1, 10)
  format?: string;
}

/** Delivery URL echo for the inserted image. */
export class BodyImageUrlDto {
  @ApiProperty({ format: 'uri' })
  url!: string;
}
```

- [ ] **Step 2: Failing tests** —

media.service.spec (adapt to local harness; the service builds URLs with the same cloudName
source `attachToOwner` uses — read the file's constructor/config stubbing first):

```ts
  it('registerAsset creates a body row and returns its delivery url', async () => {
    // prisma.mediaAsset.findFirst → null (not yet registered); create → row
    // expect create called with { publicId, type: IMAGE, ownerType: POST, ownerId, role: body, ... }
    // expect result.url to contain '/image/upload/' and the publicId
  });

  it('registerAsset is idempotent: an existing owner+publicId row short-circuits', async () => {
    // prisma.mediaAsset.findFirst → { publicId } ; expect create NOT called; url still returned
  });
```

(The two comments are the CONTRACT — write real assertions against the local stub shapes.)

posts.service.spec:

```ts
  it('addBodyImage resolves the slug and registers a body asset', async () => {
    const findUnique = jest.fn().mockResolvedValue({ id: 'p1' });
    const registerAsset = jest.fn().mockResolvedValue({ url: 'https://cdn/x.jpg' });
    const svc = makeSvc(makePrisma({ findUnique }), makeMedia({ registerAsset }), makeTours());

    await expect(svc.addBodyImage('p', { publicId: 'pid' })).resolves.toEqual({
      url: 'https://cdn/x.jpg',
    });
    expect(registerAsset).toHaveBeenCalledWith(
      MediaOwnerType.POST,
      'p1',
      MediaRole.body,
      { publicId: 'pid' },
    );
  });

  it('addBodyImage 404s an unknown slug', async () => {
    const svc = makeSvc(makePrisma({ findUnique: jest.fn().mockResolvedValue(null) }), makeMedia(), makeTours());
    await expect(svc.addBodyImage('ghost', { publicId: 'x' })).rejects.toMatchObject({
      response: { code: 'POST_NOT_FOUND' },
    });
  });
```

- [ ] **Step 3: Implement**

media.service.ts (place near `attachToOwner`, reusing its cloudName source):

```ts
  /**
   * Registers ONE already-uploaded image for an owner (no replace-all — the body-image
   * insert path). Idempotent: an existing owner+publicId row just returns its URL.
   */
  async registerAsset(
    ownerType: MediaOwnerType,
    ownerId: string,
    role: MediaRole,
    input: { publicId: string; width?: number; height?: number; format?: string },
  ): Promise<{ url: string }> {
    const existing = await this.prisma.mediaAsset.findFirst({
      where: { ownerType, ownerId, publicId: input.publicId },
      select: { id: true },
    });
    if (!existing) {
      await this.prisma.mediaAsset.create({
        data: {
          publicId: input.publicId,
          type: MediaType.IMAGE,
          ownerType,
          ownerId,
          role,
          format: input.format ?? null,
          width: input.width ?? null,
          height: input.height ?? null,
          sortOrder: 0,
        },
      });
    }
    return {
      url: buildCloudinaryUrl(this.cloudName, {
        type: MediaType.IMAGE,
        publicId: input.publicId,
      }).url,
    };
  }
```

(`this.cloudName` = whatever member/config getter `attachToOwner` already uses — match it
exactly; if it is a local variable there, lift the same config read.)

posts.service.ts:

```ts
  /** Registers an uploaded body image on the post (insert-image flow). 404 before write. */
  async addBodyImage(slug: string, input: RegisterBodyImageDto): Promise<{ url: string }> {
    const post = await this.prisma.post.findUnique({ where: { slug }, select: { id: true } });
    if (!post) throw this.notFound(slug);
    return this.media.registerAsset(MediaOwnerType.POST, post.id, MediaRole.body, input);
  }
```

admin-posts.controller.ts (after `setMedia`):

```ts
  @HttpPost(':slug/body-images')
  @ApiOperation({ summary: 'Admin: register an uploaded body image (markdown insert)' })
  @ApiCreatedResponse({ type: BodyImageUrlDto })
  @ApiResponse({ status: 404, description: 'Not found' })
  addBodyImage(
    @Param('slug') slug: string,
    @Body() body: RegisterBodyImageDto,
  ): Promise<{ url: string }> {
    return this.postsService.addBodyImage(slug, body);
  }
```

(imports: `RegisterBodyImageDto`, `BodyImageUrlDto`.)

- [ ] **Step 4: Run + commit**

Run: `pnpm nx run-many -t lint typecheck test -p @tourism/api` → green (record count).

```bash
git add apps/api/src/modules/media apps/api/src/modules/posts
git commit -m "feat(api): register post body images (idempotent, GC-on-post-delete)"
```

### Task 4: Regen types + consumer builds

- [ ] Boot API → poll `http://localhost:3000/api/docs-json` → `pnpm nx run @tourism/core:api-types`
  → kill the port-3000 tree. Then `pnpm nx run-many -t build -p @tourism/web @tourism/admin @tourism/core`
  and `pnpm nx test @tourism/web @tourism/admin` (role enum widened to include `'body'` —
  if any consumer switch/type narrows exhaustively on role, fix minimally and note it).

```bash
git add libs/shared/core/src/lib/api/schema.ts
git commit -m "chore(core): regen api types - MediaRole.body + body-image endpoint"
```

### Task 5: ecc review + gate + ⛔ MIGRATION GO/NO-GO + merge

- [ ] `ecc:code-reviewer` whole-slice (BE) — fix CRITICAL/HIGH.
- [ ] Gate: `pnpm nx affected -t lint test build --exclude=@tourism/mobile --base=main`.
- [ ] **⛔ STOP — user go/no-go**, then `cd apps/api && pnpm exec prisma migrate deploy`.
- [ ] Merge:

```bash
git checkout main && git pull && git merge --no-ff feat/blog-v2-body-images -m "Merge feat/blog-v2-body-images: blog v2 wave 3 slice 1 - body-image BE" && git push && git branch -d feat/blog-v2-body-images
```

---

## Slice 2 — admin FE (branch `feat/blog-v2-body-images-ui`)

### Task 6: `insertSnippet` helper (TDD)

**Files:**

- Create: `apps/admin/src/lib/posts/markdown.ts`
- Test: `apps/admin/src/lib/posts/markdown.spec.ts`

- [ ] **Step 1: Failing spec**

```ts
import { insertSnippet } from './markdown';

describe('insertSnippet', () => {
  it('inserts at the cursor with blank-line padding on both sides', () => {
    const out = insertSnippet('before\nafter', 6, '![](https://x/y.jpg)');
    expect(out.next).toBe('before\n\n![](https://x/y.jpg)\n\nafter');
    // Caret lands right after the inserted block (before + pre + snippet + post).
    expect(out.nextCursor).toBe('before\n\n![](https://x/y.jpg)\n'.length);
  });

  it('does not double blank lines that already exist', () => {
    const out = insertSnippet('before\n\n', 8, '![](u)');
    expect(out.next).toBe('before\n\n![](u)\n\n');
  });

  it('handles empty content and cursor 0', () => {
    const out = insertSnippet('', 0, '![](u)');
    expect(out.next).toBe('![](u)\n\n');
  });
});
```

- [ ] **Step 2: Implement**

```ts
/**
 * Inserts a markdown block snippet at `cursor`, padding with blank lines so the image
 * renders as its own paragraph. Returns the new content + where the caret should land
 * (after the inserted block).
 */
export function insertSnippet(
  content: string,
  cursor: number,
  snippet: string,
): { next: string; nextCursor: number } {
  const at = Math.max(0, Math.min(cursor, content.length));
  const before = content.slice(0, at);
  const after = content.slice(at);

  const pre = before.length === 0 ? '' : before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
  const post = after.startsWith('\n\n') ? '' : after.startsWith('\n') ? '\n' : '\n\n';

  const block = `${pre}${snippet}${post}`;
  const next = `${before}${block}${after}`;
  return { next, nextCursor: before.length + block.length };
}
```

- [ ] **Step 3: Run** (`--testPathPatterns=lib/posts/markdown`) → PASS. Commit:

```bash
git checkout main && git pull && git checkout -b feat/blog-v2-body-images-ui
# (branch FIRST, then the files above — reorder Steps if executing linearly)
git add apps/admin/src/lib/posts/markdown.ts apps/admin/src/lib/posts/markdown.spec.ts
git commit -m "feat(admin): insertSnippet markdown helper"
```

(NOTE: create the branch BEFORE writing files — Step 0 of this task.)

### Task 7: Insert-image button + controlled editor + preview toggle + media facet

**Files:**

- Modify: `apps/admin/src/components/crud/media-field.tsx` (export the existing local
  `uploadFile` helper — add `export` only, zero behavior change)
- Create: `apps/admin/src/components/posts/insert-image-button.tsx`
- Modify: `apps/admin/src/components/posts/post-form.tsx`
- Modify: the `/media` library role facet options (find the hardcoded
  hero/gallery/avatar list under `apps/admin/src/components/media/` or
  `apps/admin/src/lib/media-library/` and add `body`)

**Interfaces:**

- Consumes: `uploadFile(file, purpose, role)` from media-field · `signUpload` purpose union
  in `apps/admin/src/lib/uploads.ts` gains `'POST_BODY'` · `apiWrite` →
  `POST /api/v1/admin/posts/{slug}/body-images` · `insertSnippet` (Task 6) ·
  `PostContent` (existing admin renderer).
- Produces: `<InsertImageButton slug onInsert(url) />` · post-form Content section with
  Write|Preview toggle + controlled textarea.

- [ ] **Step 1:** `lib/uploads.ts` `UploadPurpose` union += `'POST_BODY'`.

- [ ] **Step 2:** media-field.tsx — `export` the local upload helper (rename to
  `uploadToCloudinary` ONLY if it is currently unnamed/inline; otherwise just add `export`
  and keep the name). No other line changes.

- [ ] **Step 3:** `insert-image-button.tsx`:

```tsx
'use client';

import { useRef, useState } from 'react';
import { ImagePlus } from 'lucide-react';

import { Button, Spinner } from '@tourism/ui';

import { uploadFile } from '../crud/media-field';
import { apiWrite } from '../../lib/api/client';
import { apiErrorMessage } from '../../lib/api/error';

interface InsertImageButtonProps {
  /** Post slug that will own the asset — undefined on CREATE (button disabled + hint). */
  slug?: string;
  /** Receives the delivery URL once uploaded + registered. */
  onInsert: (url: string) => void;
}

/**
 * Uploads an image (signed direct-to-Cloudinary, POST_BODY purpose), registers it as a
 * post body asset, and hands the delivery URL back for markdown insertion. Edit-only —
 * a new post has no slug to own the asset yet.
 */
export function InsertImageButton({ slug, onInsert }: InsertImageButtonProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = () => fileRef.current?.click();

  const handleFile = async (file: File | undefined) => {
    if (!file || !slug) return;
    setBusy(true);
    setError(null);
    try {
      const up = await uploadFile(file, 'POST_BODY', 'gallery');
      if (up.error || !up.item) {
        setError(up.error ?? 'Upload failed.');
        return;
      }
      const { url } = await apiWrite<{ url: string }>(
        'POST',
        `/api/v1/admin/posts/${encodeURIComponent(slug)}/body-images`,
        {
          publicId: up.item.publicId,
          width: up.item.width,
          height: up.item.height,
        },
      );
      onInsert(url);
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!slug || busy}
          onClick={pick}
        >
          {busy ? <Spinner data-icon="inline-start" /> : <ImagePlus data-icon="inline-start" />}
          Insert image
        </Button>
        {!slug ? (
          <span className="text-muted-foreground text-xs">
            Save the draft first to insert images.
          </span>
        ) : null}
      </div>
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
    </div>
  );
}

export default InsertImageButton;
```

(Adapt the `uploadFile` import name/signature to whatever Step 2 exported — the `role`
argument is only used for the returned item's role and is irrelevant here.)

- [ ] **Step 4:** post-form.tsx Content section:

1. `content` becomes controlled: `const [content, setContent] = useState(post?.content ?? '');`
   - `const contentRef = useRef<HTMLTextAreaElement>(null);` + Textarea gets
   `ref={contentRef}`, `value={content}`, `onChange={(e) => setContent(e.target.value)}`
   (drop `defaultValue`).
2. Editor mode toggle state: `const [editorTab, setEditorTab] = useState<'write' | 'preview'>('write');`
3. Above the Textarea, a toolbar row:

```tsx
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
                      editorTab === tab ? 'bg-background text-foreground shadow-sm' : 'hover:text-foreground',
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <InsertImageButton slug={post?.slug} onInsert={handleInsertImage} />
            </div>
```

(`cn` joins the `@tourism/ui` import; `InsertImageButton` imported from
`./insert-image-button`.)

4. Insert handler above the return:

```tsx
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
```

(`insertSnippet` imported from `../../lib/posts/markdown`.)

5. Preview pane — the Textarea renders only on the write tab; preview renders the admin
   `PostContent`:

```tsx
            {editorTab === 'write' ? (
              <Textarea ... (existing props + ref/value/onChange) ... />
            ) : (
              <div className="border-border/60 bg-muted/30 min-h-64 rounded-lg border p-4">
                <PostContent markdown={content} />
              </div>
            )}
```

(`PostContent` imported from `./post-content`. The hidden requirement: the Textarea has
`name="content"` — when it unmounts on preview the form would lose the field, so ALSO add
`<input type="hidden" name="content" value={content} />` OUTSIDE the conditional and REMOVE
`name`/`required` from the Textarea itself (keep `id` for the label). Validation stays in
zod server-side.)

- [ ] **Step 5:** `/media` role facet gains `body` — locate the hardcoded role option list
  (grep `'avatar'` under `apps/admin/src/components/media/` and `apps/admin/src/lib/media-library/`)
  and append a `body` option with the same shape/label style (`Body`).

- [ ] **Step 6: Verify + commit**

Run: `pnpm nx run-many -t lint test build -p @tourism/admin` → green (tests grow by Task 6's 3).

```bash
git add apps/admin/src/lib/uploads.ts apps/admin/src/components/crud/media-field.tsx apps/admin/src/components/posts/insert-image-button.tsx apps/admin/src/components/posts/post-form.tsx <media-facet-file>
git commit -m "feat(admin): insert body images from the post editor + write/preview toggle"
```

### Task 8: Gate + merge + docs

- [ ] Gate: `pnpm nx affected -t lint test build --exclude=@tourism/mobile --base=main`.
- [ ] Merge `feat/blog-v2-body-images-ui` (pre-authorized on green).
- [ ] Docs: this plan's STATUS + roadmap STATUS + memory.

---

## STATUS

- [x] Slice 1 (Tasks 1-5): BE — **DONE**, merged `96e9ff1` (2026-07-03). Migration
  `20260703144308_add_media_role_body` APPLIED to live Supabase (user GO, before merge).
  api 309 tests. ecc APPROVE-WITH-NOTES (LOW fast-follow: `registerAsset`
  findFirst-then-create benign dup race — unique index/upsert later).
- [x] Slice 2 (Tasks 6-8): admin editor UI — **DONE**, merged `335a60f` fast-forward
  (2026-07-05). admin 142 tests (139 + 3 insertSnippet). Deviations from the plan's
  snippets (all approved): body-image registration goes through a `registerBodyImage`
  server action in `lib/uploads.ts` (`apiWrite` is server-only — the plan's direct import
  into the client button would not build); `uploadFile` called with the file's real
  `(file, role, purpose)` order; `ErrorAlert` instead of the snippet's bare `<p>` (global
  constraint); extra `catch` around the server-action call for network failures.
