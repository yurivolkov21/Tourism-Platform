'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';

import { Avatar, AvatarFallback, AvatarImage, Button, toast } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { removeAvatar, requestAvatarUpload, saveAvatar } from '../../lib/account/actions';
import { createClient } from '../../lib/supabase/client';

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

/**
 * Avatar upload: sign via the API (`/users/me/avatar/sign`), POST the bytes straight to Cloudinary,
 * then attach by publicId (`PUT /users/me/avatar`). Mirrors the URL into Supabase metadata so the
 * navbar avatar updates live.
 */
export function AvatarUploader({ initialUrl, name }: { initialUrl: string | null; name: string }) {
  const t = messages.auth.account.profile.avatar;
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState<string | null>(initialUrl);
  const [busy, setBusy] = useState(false);

  async function syncMetadata(avatarUrl: string | null) {
    await createClient()
      .auth.updateUser({ data: { avatar_url: avatarUrl } })
      .catch(() => {
        // Best-effort navbar sync; the API already holds the avatar.
      });
  }

  async function onPick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const signed = await requestAvatarUpload(file.name, file.type);
      if (signed.error || !signed.params) throw new Error(signed.error ?? 'sign failed');
      const p = signed.params;

      const fd = new FormData();
      fd.append('file', file);
      fd.append('api_key', p.apiKey);
      fd.append('timestamp', String(p.timestamp));
      fd.append('signature', p.signature);
      fd.append('folder', p.folder);
      fd.append('public_id', p.publicId);
      const res = await fetch(p.uploadUrl, { method: 'POST', body: fd });
      if (!res.ok) throw new Error('upload failed');
      const uploaded = (await res.json()) as { public_id: string; format?: string; width?: number };

      const saved = await saveAvatar(uploaded.public_id, uploaded.format, uploaded.width);
      if (saved.error) throw new Error(saved.error);

      setUrl(saved.avatarUrl ?? null);
      await syncMetadata(saved.avatarUrl ?? null);
      toast.success(t.saved);
      router.refresh();
    } catch {
      toast.error(t.error);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function onRemove() {
    setBusy(true);
    const result = await removeAvatar();
    if (result.error) {
      toast.error(result.error);
      setBusy(false);
      return;
    }
    setUrl(null);
    await syncMetadata(null);
    toast.success(t.saved);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <h2 className="font-heading text-lg font-semibold">{t.heading}</h2>
      <div className="flex items-center gap-4">
        <Avatar className="size-16">
          {url ? <AvatarImage src={url} alt="" /> : null}
          <AvatarFallback>{initialsOf(name)}</AvatarFallback>
        </Avatar>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            aria-label={t.change}
            onChange={onPick}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            {busy ? t.uploading : t.change}
          </Button>
          {url ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => void onRemove()} disabled={busy}>
              {t.remove}
            </Button>
          ) : null}
        </div>
      </div>
      <p className="text-muted-foreground text-xs">{t.hint}</p>
    </div>
  );
}

export default AvatarUploader;
