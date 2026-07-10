'use client';

import { useMemo, useState } from 'react';
import { X } from 'lucide-react';

import { Badge, Button, Input } from '@tourism/ui';

export interface TagsInputProps {
  /** Current tag display names, in order. */
  value: string[];
  onChange: (next: string[]) => void;
  /** Existing tags to suggest (admin tag list). */
  suggestions: { slug: string; name: string }[];
  max?: number;
}

/** Case-insensitive membership (display names may differ only by casing). */
const has = (list: string[], name: string) =>
  list.some((t) => t.toLowerCase() === name.toLowerCase());

/**
 * Free-form tag editor: removable chips + a text input. Typing filters the existing-tag
 * suggestions (click to add); Enter adds the raw text as a new tag. Caps at `max`.
 */
export function TagsInput({
  value,
  onChange,
  suggestions,
  max = 10,
}: TagsInputProps) {
  const [draft, setDraft] = useState('');
  const full = value.length >= max;

  const matches = useMemo(() => {
    const q = draft.trim().toLowerCase();
    return suggestions
      .filter((s) => !has(value, s.name))
      .filter((s) => (q ? s.name.toLowerCase().includes(q) : true))
      .slice(0, 6);
  }, [draft, suggestions, value]);

  const add = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || full || has(value, trimmed)) return;
    onChange([...value, trimmed]);
    setDraft('');
  };

  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {value.map((name) => (
            <Badge key={name} variant="secondary" className="gap-1 pr-1">
              {name}
              <button
                type="button"
                aria-label={`Remove tag ${name}`}
                className="hover:text-destructive inline-flex cursor-pointer items-center rounded-sm"
                onClick={() => onChange(value.filter((t) => t !== name))}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}

      <Input
        value={draft}
        disabled={full}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            add(draft);
          }
        }}
        placeholder={
          full ? `Maximum ${max} tags` : 'Type a topic and press Enter…'
        }
        aria-label="Add a tag"
      />

      {!full && matches.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-muted-foreground text-xs">Existing:</span>
          {matches.map((s) => (
            <Button
              key={s.slug}
              type="button"
              variant="outline"
              size="sm"
              className="h-6 rounded-full px-2.5 text-xs"
              onClick={() => add(s.name)}
            >
              {s.name}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default TagsInput;
