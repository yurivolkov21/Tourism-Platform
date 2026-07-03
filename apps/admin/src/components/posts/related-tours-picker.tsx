'use client';

import { ChevronDown, X } from 'lucide-react';

import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@tourism/ui';

export interface RelatedToursPickerProps {
  /** Selected tour slugs, in pick order. */
  value: string[];
  onChange: (next: string[]) => void;
  /** Published tours to offer. */
  options: { slug: string; title: string }[];
  max?: number;
}

/**
 * Hand-pick up to `max` tours for a post ("tours in this story"). Checkbox dropdown (the
 * admin facet pattern) + ordered chips; order = pick order (drives the article's display).
 */
export function RelatedToursPicker({ value, onChange, options, max = 3 }: RelatedToursPickerProps) {
  const full = value.length >= max;
  const titleBySlug = new Map(options.map((o) => [o.slug, o.title]));

  const toggle = (slug: string, checked: boolean) => {
    if (checked && !value.includes(slug) && !full) onChange([...value, slug]);
    if (!checked) onChange(value.filter((s) => s !== slug));
  };

  return (
    <div className="flex flex-col gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button type="button" variant="outline" className="w-full max-w-xs justify-between" />}
        >
          <span className="truncate">
            {value.length === 0 ? 'Select tours…' : `${value.length} of ${max} selected`}
          </span>
          <ChevronDown className="text-muted-foreground size-4 shrink-0" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-80 w-72 overflow-y-auto">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Published tours</DropdownMenuLabel>
            {options.map((o) => {
              const checked = value.includes(o.slug);
              return (
                <DropdownMenuCheckboxItem
                  key={o.slug}
                  checked={checked}
                  disabled={!checked && full}
                  onCheckedChange={(c) => toggle(o.slug, c === true)}
                  closeOnClick={false}
                >
                  {o.title}
                </DropdownMenuCheckboxItem>
              );
            })}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {value.length > 0 ? (
        <ol className="flex flex-col gap-1.5">
          {value.map((slug, i) => (
            <li key={slug} className="flex items-center gap-2">
              <Badge variant="outline" className="tabular-nums">{i + 1}</Badge>
              <span className="truncate text-sm">{titleBySlug.get(slug) ?? slug}</span>
              <button
                type="button"
                aria-label={`Remove ${titleBySlug.get(slug) ?? slug}`}
                className="text-muted-foreground hover:text-destructive inline-flex cursor-pointer items-center"
                onClick={() => onChange(value.filter((s) => s !== slug))}
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}

export default RelatedToursPicker;
