'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

import { Badge, Input, cn } from '@tourism/ui';

interface ChipInputProps {
  /** Field name; one hidden input is rendered per chip → `formData.getAll(name)`. */
  name: string;
  id?: string;
  defaultValue?: string[];
  placeholder?: string;
}

/** Tag/chip input: type + Enter to add a chip, ✕ (or Backspace on empty) to remove. */
export function ChipInput({ name, id, defaultValue = [], placeholder }: ChipInputProps) {
  const [chips, setChips] = useState<string[]>(defaultValue);
  const [draft, setDraft] = useState('');

  function add(value: string) {
    const trimmed = value.trim();
    if (trimmed && !chips.includes(trimmed)) setChips([...chips, trimmed]);
    setDraft('');
  }
  function remove(chip: string) {
    setChips(chips.filter((c) => c !== chip));
  }

  return (
    <div className="space-y-2">
      {chips.map((c) => (
        <input key={c} type="hidden" name={name} value={c} />
      ))}
      {chips.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <Badge key={c} variant="secondary" className="gap-1 pr-1">
              {c}
              <button
                type="button"
                onClick={() => remove(c)}
                aria-label={`Remove ${c}`}
                className="hover:text-destructive inline-flex items-center rounded-sm opacity-60 transition-opacity hover:opacity-100"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
      <Input
        id={id}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            add(draft);
          } else if (e.key === 'Backspace' && draft === '' && chips.length > 0) {
            remove(chips[chips.length - 1]);
          }
        }}
        onBlur={() => draft.trim() && add(draft)}
        placeholder={placeholder}
        className={cn(chips.length > 0 && 'mt-0')}
      />
    </div>
  );
}

export default ChipInput;
