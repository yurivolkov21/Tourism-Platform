'use client';

import { useState } from 'react';
import { Check, Search, X } from 'lucide-react';

import { Badge, Input } from '@tourism/ui';

export interface DestinationOption {
  slug: string;
  name: string;
}

interface DestinationPickerProps {
  options: DestinationOption[];
  /** Controlled selection (slugs); parent needs it to drive the "primary destination" select. */
  value: string[];
  onChange: (next: string[]) => void;
}

/**
 * Searchable multi-select for destinations: filter box + toggle list + removable chips. Renders one
 * hidden `destinationSlugs` input per selection → `formData.getAll('destinationSlugs')`.
 */
export function DestinationPicker({ options, value, onChange }: DestinationPickerProps) {
  const [query, setQuery] = useState('');
  const filtered = options.filter((o) => o.name.toLowerCase().includes(query.trim().toLowerCase()));
  const selected = options.filter((o) => value.includes(o.slug));

  function toggle(slug: string) {
    onChange(value.includes(slug) ? value.filter((s) => s !== slug) : [...value, slug]);
  }

  return (
    <div className="space-y-2">
      {value.map((s) => (
        <input key={s} type="hidden" name="destinationSlugs" value={s} />
      ))}

      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((o) => (
            <Badge key={o.slug} variant="secondary" className="gap-1 pr-1">
              {o.name}
              <button
                type="button"
                onClick={() => toggle(o.slug)}
                aria-label={`Remove ${o.name}`}
                className="hover:text-destructive inline-flex items-center rounded-sm opacity-60 transition-opacity hover:opacity-100"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}

      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search destinations…"
          className="pl-8"
          aria-label="Search destinations"
        />
      </div>

      <div className="max-h-48 overflow-y-auto rounded-lg border">
        {filtered.length === 0 ? (
          <p className="text-muted-foreground p-3 text-center text-sm">No destinations found.</p>
        ) : (
          filtered.map((o) => {
            const isSelected = value.includes(o.slug);
            return (
              <button
                key={o.slug}
                type="button"
                onClick={() => toggle(o.slug)}
                aria-pressed={isSelected}
                className="hover:bg-muted flex w-full items-center justify-between px-2.5 py-1.5 text-left text-sm transition-colors"
              >
                <span>{o.name}</span>
                {isSelected ? <Check className="text-primary size-4" /> : null}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

export default DestinationPicker;
