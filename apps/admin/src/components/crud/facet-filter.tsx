'use client';

import { ChevronDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import {
  Button,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@tourism/ui';

export interface FacetOption {
  value: string;
  label: string;
}

/**
 * The shared checkbox-facet dropdown for admin toolbars (Tours category/
 * destination, Bookings tour/departure): outline trigger with icon + truncated
 * summary label, a labelled checkbox list, and a "Clear filter" item once
 * anything is selected. `multiple` keeps the menu open across toggles
 * (multi-select); single-select closes per pick. The trigger label stays
 * caller-computed — the counting/naming rules differ per facet.
 * (The media library predates this component and still carries its own copy.)
 */
export function FacetFilter({
  label,
  icon: Icon,
  triggerLabel,
  options,
  selected,
  multiple = false,
  disabled = false,
  onToggle,
  onClear,
  contentClassName = 'w-52',
}: {
  /** Menu heading, also the trigger's aria-label (e.g. "Filter by category"). */
  label: string;
  icon: LucideIcon;
  /** Precomputed trigger text ("All categories" / the pick / "2 categories"). */
  triggerLabel: string;
  options: FacetOption[];
  /** Selected values — single-select callers hold zero or one entries. */
  selected: string[];
  multiple?: boolean;
  disabled?: boolean;
  onToggle: (value: string, checked: boolean) => void;
  onClear: () => void;
  /** Popup sizing (add `max-h-80 overflow-y-auto` for long lists). */
  contentClassName?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            className="w-full justify-between font-normal sm:w-52"
            aria-label={label}
            disabled={disabled}
          />
        }
      >
        <span className="inline-flex min-w-0 items-center gap-2">
          <Icon className="size-4 shrink-0" />
          <span className="truncate">{triggerLabel}</span>
        </span>
        <ChevronDown className="text-muted-foreground size-4 shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className={contentClassName}>
        <DropdownMenuGroup>
          <DropdownMenuLabel>{label}</DropdownMenuLabel>
          {options.map((o) => (
            <DropdownMenuCheckboxItem
              key={o.value}
              checked={selected.includes(o.value)}
              onCheckedChange={(checked) => onToggle(o.value, checked === true)}
              closeOnClick={!multiple}
            >
              {o.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
        {selected.length ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onClear}>Clear filter</DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default FacetFilter;
