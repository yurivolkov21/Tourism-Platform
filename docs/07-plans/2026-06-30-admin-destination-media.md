# Admin Destination Images (hero + gallery) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admins attach a hero image + up to 9 gallery images to a destination, from the create and edit forms, uploaded direct-to-Cloudinary.

**Architecture:** One additive BE upload purpose (`DESTINATION_GALLERY`). The form holds a client-side media list; each image uploads to Cloudinary on pick (signed via the API). On submit the create/update server action persists the full set via `PUT /admin/destinations/:slug/media` (replace-all). Mirrors the proven web avatar uploader.

**Tech Stack:** NestJS (Cloudinary signing), Next.js 16 RSC + server actions, `@tourism/ui` (Base UI), `@dnd-kit/*` (already a dep), Jest.

## Global Constraints

- Node ≥ 22, pnpm 11. Run via Nx (`pnpm nx <target> @tourism/<proj>`).
- Branch: `feat/admin-destination-media` (created; spec committed there).
- Build UI on `@tourism/ui` only — Base UI uses the `render` prop, not Radix `asChild`. Base UI footguns: a `DropdownMenuItem` must not `render` a native `<button>`; `DropdownMenuLabel` only inside a group.
- No hex in authored CSS (`pnpm check:no-hex`).
- ≤ 10 images/destination: 1 hero + ≤ 9 gallery. BE caps the set at 30.
- Accept `image/png, image/jpeg, image/webp` in the file picker (match the avatar uploader).
- TDD on pure logic (≥ 80%). Conventional Commits, no AI attribution. Run `/gate` before declaring green.
- Authed writes from server actions use `apiWrite('POST'|'PUT', path, body)` (native fetch — the typed client's streamed body fails on Vercel). GET uses `getApiClient()`.

---

### Task 1: Backend — `DESTINATION_GALLERY` upload purpose

**Files:**
- Modify: `apps/api/src/modules/uploads/dto/create-signed-upload-url.dto.ts` (enum case)
- Modify: `apps/api/src/modules/uploads/uploads.service.ts` (two switches)
- Test: `apps/api/src/modules/uploads/uploads.service.spec.ts`

**Interfaces:**
- Produces: signing a `{ purpose: 'DESTINATION_GALLERY', filename, contentType }` returns `SignedUploadParams` with `folder` ending `/destinations/gallery` and `resourceType: 'image'`.

- [ ] **Step 1: Write the failing test** — add to `uploads.service.spec.ts` (mirror the existing `DESTINATION_HERO`/`TOUR_GALLERY` cases):

```typescript
it('signs DESTINATION_GALLERY into the destinations/gallery image folder', () => {
  const params = service.createSignedUploadParams({
    purpose: UploadPurpose.DESTINATION_GALLERY,
    filename: 'beach.jpg',
    contentType: 'image/jpeg',
  } as never);
  expect(params.resourceType).toBe('image');
  expect(params.folder).toMatch(/\/destinations\/gallery$/);
  expect(params.uploadUrl).toContain('/image/upload');
});
```

- [ ] **Step 2: Run to verify it fails** — `pnpm nx test @tourism/api --testPathPatterns=uploads.service`
Expected: FAIL — `DESTINATION_GALLERY` is not a member of `UploadPurpose` (and the exhaustive switches don't handle it).

- [ ] **Step 3: Implement** — in `create-signed-upload-url.dto.ts`, add to the `UploadPurpose` enum (after `DESTINATION_VIDEO`):

```typescript
  DESTINATION_GALLERY = 'DESTINATION_GALLERY',
```

In `uploads.service.ts`, add the case to BOTH switches:

```typescript
// resourceTypeForPurpose → the 'image' group:
    case UploadPurpose.DESTINATION_HERO:
    case UploadPurpose.DESTINATION_GALLERY:
    case UploadPurpose.USER_AVATAR:
      return 'image';
```

```typescript
// folderForPurpose:
    case UploadPurpose.DESTINATION_GALLERY:
      return `${this.rootFolder}/destinations/gallery`;
```

- [ ] **Step 4: Run tests** — `pnpm nx test @tourism/api --testPathPatterns=uploads.service` → PASS. `pnpm nx typecheck @tourism/api` → clean (exhaustive switches now compile).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/uploads
git commit -m "feat(api): add DESTINATION_GALLERY upload purpose"
```

(Optional, non-blocking) `/regen-types` so `@tourism/core` learns the enum value; the FE signs via `apiWrite` with a string purpose, so this is not required for the FE to build.

---

### Task 2: FE media pure logic — parse / assemble / preview URL (TDD)

**Files:**
- Create: `apps/admin/src/lib/destinations/media.ts`
- Test: `apps/admin/src/lib/destinations/media.spec.ts`

**Interfaces:**
- Produces:
  - type `MediaInput = { publicId: string; role: 'hero' | 'gallery'; format?: string; width?: number; height?: number; url?: string }`
  - type `MediaPayload = { publicId: string; type: 'IMAGE'; role: 'hero' | 'gallery'; format?: string; width?: number; height?: number; sortOrder: number }`
  - `parseMediaField(json: string): MediaInput[]` — safe-parse; keep items with a string `publicId` and role hero|gallery; at most one hero; clamp gallery to 9.
  - `assembleMediaSet(items: MediaInput[]): MediaPayload[]` — hero first (sortOrder 0), then gallery (sortOrder 1..n).
  - `cloudinaryUrl(cloudName: string, publicId: string, format?: string): string`

- [ ] **Step 1: Write the failing tests**

```typescript
import { parseMediaField, assembleMediaSet, cloudinaryUrl, type MediaInput } from './media';

test('parseMediaField keeps valid items, ≤1 hero, ≤9 gallery', () => {
  const gallery = Array.from({ length: 12 }, (_, i) => ({ publicId: `g${i}`, role: 'gallery' }));
  const json = JSON.stringify([
    { publicId: 'h1', role: 'hero' },
    { publicId: 'h2', role: 'hero' },
    ...gallery,
    { role: 'gallery' }, // malformed (no publicId) → dropped
  ]);
  const out = parseMediaField(json);
  expect(out.filter((m) => m.role === 'hero')).toHaveLength(1);
  expect(out.filter((m) => m.role === 'gallery')).toHaveLength(9);
});

test('parseMediaField tolerates junk', () => {
  expect(parseMediaField('')).toEqual([]);
  expect(parseMediaField('not json')).toEqual([]);
  expect(parseMediaField('{}')).toEqual([]);
});

test('assembleMediaSet emits hero first then ordered gallery', () => {
  const items: MediaInput[] = [
    { publicId: 'g1', role: 'gallery' },
    { publicId: 'h1', role: 'hero', format: 'jpg', width: 1920, height: 1080 },
    { publicId: 'g2', role: 'gallery' },
  ];
  const set = assembleMediaSet(items);
  expect(set.map((m) => m.publicId)).toEqual(['h1', 'g1', 'g2']);
  expect(set.map((m) => m.sortOrder)).toEqual([0, 1, 2]);
  expect(set[0]).toMatchObject({ type: 'IMAGE', role: 'hero', format: 'jpg' });
});

test('cloudinaryUrl builds a delivery URL', () => {
  expect(cloudinaryUrl('demo', 'tourism/destinations/hero/123-x', 'jpg')).toBe(
    'https://res.cloudinary.com/demo/image/upload/tourism/destinations/hero/123-x.jpg',
  );
  expect(cloudinaryUrl('demo', 'p')).toBe('https://res.cloudinary.com/demo/image/upload/p');
});
```

- [ ] **Step 2: Run to verify fail** — `pnpm nx test @tourism/admin --testPathPatterns=destinations/media` → FAIL (module not found).

- [ ] **Step 3: Implement `media.ts`**

```typescript
export interface MediaInput {
  publicId: string;
  role: 'hero' | 'gallery';
  format?: string;
  width?: number;
  height?: number;
  /** Preview URL for items loaded on edit; just-uploaded items derive it from cloudName+publicId. */
  url?: string;
}

export interface MediaPayload {
  publicId: string;
  type: 'IMAGE';
  role: 'hero' | 'gallery';
  format?: string;
  width?: number;
  height?: number;
  sortOrder: number;
}

export const MAX_GALLERY = 9;

export function parseMediaField(json: string): MediaInput[] {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) return [];
  const valid = raw.filter(
    (m): m is MediaInput =>
      !!m &&
      typeof (m as MediaInput).publicId === 'string' &&
      ((m as MediaInput).role === 'hero' || (m as MediaInput).role === 'gallery'),
  );
  const hero = valid.filter((m) => m.role === 'hero').slice(0, 1);
  const gallery = valid.filter((m) => m.role === 'gallery').slice(0, MAX_GALLERY);
  return [...hero, ...gallery];
}

export function assembleMediaSet(items: MediaInput[]): MediaPayload[] {
  const hero = items.filter((m) => m.role === 'hero').slice(0, 1);
  const gallery = items.filter((m) => m.role === 'gallery');
  return [...hero, ...gallery].map((m, i) => ({
    publicId: m.publicId,
    type: 'IMAGE',
    role: m.role,
    format: m.format,
    width: m.width,
    height: m.height,
    sortOrder: i,
  }));
}

export function cloudinaryUrl(cloudName: string, publicId: string, format?: string): string {
  const base = `https://res.cloudinary.com/${cloudName}/image/upload/${publicId}`;
  return format ? `${base}.${format}` : base;
}
```

- [ ] **Step 4: Run tests** → PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/lib/destinations/media.ts apps/admin/src/lib/destinations/media.spec.ts
git commit -m "feat(admin): destination media pure helpers (parse/assemble/url) — TDD"
```

---

### Task 3: FE — `signDestinationUpload` server action

**Files:**
- Modify: `apps/admin/src/lib/destinations/actions.ts` (append the action)

**Interfaces:**
- Consumes: `apiWrite` (`../api/client`), `apiErrorMessage` (`../api/error`).
- Produces: `signDestinationUpload(purpose: 'DESTINATION_HERO' | 'DESTINATION_GALLERY', filename: string, contentType: string): Promise<{ params?: SignParams; error?: string }>` where `SignParams = { signature: string; timestamp: number; apiKey: string; cloudName: string; folder: string; publicId: string; uploadUrl: string }`.

- [ ] **Step 1: Implement** — append to `actions.ts` (keep the file's `'use server'` at top):

```typescript
export interface SignParams {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
  publicId: string;
  uploadUrl: string;
}

/** Signs a direct-to-Cloudinary upload for a destination image (hero or gallery). */
export async function signDestinationUpload(
  purpose: 'DESTINATION_HERO' | 'DESTINATION_GALLERY',
  filename: string,
  contentType: string,
): Promise<{ params?: SignParams; error?: string }> {
  try {
    const data = await apiWrite<SignParams>('POST', '/api/v1/admin/uploads/signed-url', {
      purpose,
      filename,
      contentType,
    });
    return { params: data };
  } catch (e) {
    return { error: apiErrorMessage(e) };
  }
}
```

(`apiWrite` already unwraps the `{ data }` envelope and throws `ApiRequestError` on non-2xx. Confirm `apiWrite`/`apiErrorMessage` are imported at the top of `actions.ts`; the existing delete/create actions already import them.)

- [ ] **Step 2: Typecheck** — `pnpm nx build @tourism/admin` compiles.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/lib/destinations/actions.ts
git commit -m "feat(admin): signDestinationUpload server action"
```

---

### Task 4: FE — `DestinationMediaField` widget

**Files:**
- Create: `apps/admin/src/components/destinations/destination-media-field.tsx`

**Interfaces:**
- Consumes: `MediaInput`, `cloudinaryUrl`, `MAX_GALLERY` (Task 2); `signDestinationUpload` (Task 3); `@tourism/ui` (`Button`, `FieldLegend`, `FieldDescription`); `@dnd-kit/*`.
- Produces: `<DestinationMediaField initial={MediaInput[]} onChange={(items: MediaInput[]) => void} />`.

Reference: `apps/web/src/components/account/avatar-uploader.tsx` for the exact upload sequence (sign → build FormData → `fetch(uploadUrl, POST)` → read `{ public_id, format, width, height }`). Reference the dashboard `data-table.tsx` for the `@dnd-kit` `DndContext`/`SortableContext`/`useSortable` + `arrayMove` pattern.

- [ ] **Step 1: Implement** — `'use client'`. Hold `items: MediaInput[]` in state (seeded from `initial`); call `onChange(items)` whenever it changes (the parent serialises it to the hidden field). A shared `uploadFile(file, role)` helper:

```tsx
async function uploadFile(file: File, role: 'hero' | 'gallery'): Promise<MediaInput | null> {
  const purpose = role === 'hero' ? 'DESTINATION_HERO' : 'DESTINATION_GALLERY';
  const signed = await signDestinationUpload(purpose, file.name, file.type);
  if (signed.error || !signed.params) return null;
  const p = signed.params;
  const fd = new FormData();
  fd.append('file', file);
  fd.append('api_key', p.apiKey);
  fd.append('timestamp', String(p.timestamp));
  fd.append('signature', p.signature);
  fd.append('folder', p.folder);
  fd.append('public_id', p.publicId);
  const res = await fetch(p.uploadUrl, { method: 'POST', body: fd });
  if (!res.ok) return null;
  const up = (await res.json()) as { public_id: string; format?: string; width?: number; height?: number };
  return { publicId: up.public_id, role, format: up.format, width: up.width, height: up.height,
    url: cloudinaryUrl(p.cloudName, up.public_id, up.format) };
}
```

Render two sub-areas inside a `FieldSet`-style section (match the form's "Form Layout 2" section: a left `<div>` with `FieldLegend` "Images" + `FieldDescription`, and a right `md:col-span-2` content column):
- **Hero**: a single `~16/9` drop card. If a hero exists → show `<img src={hero.url}>` with a Remove button; else a "Upload hero image" button (hidden `<input type=file accept="image/png,image/jpeg,image/webp">`). On pick → set a per-slot busy state, `uploadFile(file,'hero')`, replace the hero item; on failure show an inline error.
- **Gallery**: a responsive thumbnail grid wrapped in `DndContext` + `SortableContext` (`rectSortingStrategy` or vertical), each tile a `useSortable` item with a drag cursor + a Remove (×) button. An "Add images" button (hidden multi `<input type=file multiple>`); on pick, upload each (sequentially or `Promise.all`), append the successful ones. Disable "Add images" when `gallery.length >= MAX_GALLERY` and show a "9 max" hint. `onDragEnd` → `arrayMove` the gallery items.
- Show a small per-item spinner while uploading; failed uploads aren't added and surface a dismissible inline error line.

All colours via tokens (no hex). `next/image` is optional — a plain `<img>` is fine for admin previews.

- [ ] **Step 2: Typecheck + lint + no-hex** — `pnpm nx lint @tourism/admin`, `pnpm nx build @tourism/admin`, `pnpm check:no-hex` all clean.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/components/destinations/destination-media-field.tsx
git commit -m "feat(admin): DestinationMediaField (hero slot + gallery grid + dnd)"
```

---

### Task 5: Form + actions integration (create AND edit)

**Files:**
- Modify: `apps/admin/src/components/destinations/destination-form.tsx`
- Modify: `apps/admin/src/lib/destinations/actions.ts` (create + update set media)

**Interfaces:**
- Consumes: `DestinationMediaField` (Task 4), `MediaInput`/`assembleMediaSet`/`parseMediaField` (Task 2), `signDestinationUpload` (Task 3).

- [ ] **Step 1: Wire the widget into the form** — in `destination-form.tsx`, seed the initial media from `destination?.media` (map `MediaItemDto` → `MediaInput`: `{ publicId` is not on `MediaItemDto` — it returns `url`/`role`/dims; so for existing items store `{ publicId: deriveFromUrl?, role, url, width, height }`}`).

> NOTE: `MediaItemDto` (read shape) returns `url` + `role` + dims but NOT `publicId`. To re-PUT an unchanged existing item we need its `publicId`. Resolve this in Step 1a.

- [ ] **Step 1a: Make existing items re-submittable** — the cleanest fix: have the admin destination read include `publicId` per media item. Check `apps/api/src/modules/media/dto/media.dto.ts` `MediaItemDto`: if it lacks `publicId`, add `@ApiProperty() publicId!: string;` to `MediaItemDto` and ensure `MediaService` read maps it (it already stores `publicId` on `MediaAsset`). Add/extend a service test asserting `publicId` is present on read. Then `/regen-types`. (This keeps edit lossless — otherwise editing a destination would drop its existing images.) Map existing → `MediaInput { publicId, role, url, width, height }`.

- [ ] **Step 2: Hidden field + state** — add `const [media, setMedia] = useState<MediaInput[]>(initialMedia)` and render:

```tsx
<DestinationMediaField initial={initialMedia} onChange={setMedia} />
<input type="hidden" name="media" value={JSON.stringify(media)} />
```

Place the Images section as its own `FieldSet`/Separator block between "Destination details" and "Content & visibility".

- [ ] **Step 3: Persist on save** — in `actions.ts`, after the create/update API call succeeds, set the media. For **create**, read the created slug from the POST response; for **update**, the slug is already bound. Add a private helper and call it in both:

```typescript
import { assembleMediaSet, parseMediaField } from './media';

async function putDestinationMedia(slug: string, mediaJson: string): Promise<string | null> {
  try {
    const set = assembleMediaSet(parseMediaField(mediaJson));
    await apiWrite('PUT', `/api/v1/admin/destinations/${slug}/media`, { media: set });
    return null;
  } catch (e) {
    return apiErrorMessage(e);
  }
}
```

- `createDestination`: the create `apiWrite('POST', '/api/v1/admin/destinations', body)` returns the created `DestinationDto` (it has `slug`). Capture it: `const created = await apiWrite<{ slug: string }>('POST', …, body)`. Then `const mediaErr = await putDestinationMedia(created.slug, String(formData.get('media') ?? '[]'))`. On `mediaErr`, return `{ error: 'Saved, but images couldn't be attached: ' + mediaErr }` **after** the destination exists, then `redirect`/`revalidate` as before (the record is saved; this is a non-fatal warning).
- `updateDestination`: after the PATCH, `await putDestinationMedia(slug, String(formData.get('media') ?? '[]'))` with the same non-fatal handling.
- Keep `revalidatePath('/destinations')` and the existing redirect.

- [ ] **Step 4: Verify** — `pnpm nx lint @tourism/admin && pnpm nx build @tourism/admin && pnpm check:no-hex` clean.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/components/destinations/destination-form.tsx apps/admin/src/lib/destinations/actions.ts
git commit -m "feat(admin): attach destination hero+gallery on create/edit"
```

---

### Task 6: Gate + manual review

- [ ] **Step 1: Gate** — `pnpm nx run-many -t lint test build -p @tourism/admin @tourism/api` + `pnpm check:no-hex`. All green.
- [ ] **Step 2: Manual review on the deploy** — create a destination WITH a hero + 2–3 gallery images (verify each uploads, reorders, removes); save → reopen edit → existing images load and are preserved on re-save; remove all → save → images cleared; try a non-image file → inline format error.
- [ ] **Step 3:** Merge per the user's flow (confirm before merge/push).

## Notes for the implementer

- The upload sequence is identical to `apps/web/src/components/account/avatar-uploader.tsx` — read it first.
- `@dnd-kit` reorder pattern: copy the `DndContext`/`SortableContext`/`useSortable`/`arrayMove` usage from `apps/admin/src/components/dashboard/data-table.tsx`.
- `apiWrite<T>(method, path, body)` returns the unwrapped `T` and throws `ApiRequestError` on non-2xx (`apps/admin/src/lib/api/client.ts`).
- Base UI footguns still apply to any menu/dialog you add (none required here; the file picker is a hidden `<input type=file>`).
- Keep `destination-media-field.tsx` focused (< ~250 lines); if it grows, split the gallery tile into a sibling component.
