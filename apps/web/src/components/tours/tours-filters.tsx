'use client';

import { useId, useState } from 'react';
import { MinusIcon, PlusIcon } from 'lucide-react';

import type { DurationBucket, PriceBucket, TourTheme, TravelStyle } from '@tourism/core';

import { Button, Checkbox } from '@tourism/ui';
import { messages } from '@tourism/i18n';

export interface ToursFilterState {
  destinations: string[];
  categories: string[];
  durations: DurationBucket[];
  styles: TravelStyle[];
  themes: TourTheme[];
  prices: PriceBucket[];
}

export type FacetKey = keyof ToursFilterState;

const DURATIONS: DurationBucket[] = ['1', '2-3', '4+'];
const PRICES: PriceBucket[] = ['<100', '100-300', '300+'];

interface Option {
  value: string;
  label: string;
}

function FacetGroup({
  heading,
  options,
  selected,
  onToggle,
}: {
  heading: string;
  options: Option[];
  selected: readonly string[];
  onToggle: (value: string) => void;
}) {
  const activeInGroup = options.filter((o) => selected.includes(o.value)).length;
  // Collapsed by default to save space; opens automatically if the group already has a selection.
  const [open, setOpen] = useState(activeInGroup > 0);
  const panelId = useId();

  return (
    <div className="border-border border-b pb-5 last:border-b-0 last:pb-0">
      <h3>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={panelId}
          className="text-foreground flex w-full items-center justify-between gap-2"
        >
          <span className="font-sans text-sm font-semibold tracking-wide uppercase">
            {heading}
            {activeInGroup > 0 ? (
              <span className="text-primary ml-1.5 text-xs">({activeInGroup})</span>
            ) : null}
          </span>
          {open ? (
            <MinusIcon className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
          ) : (
            <PlusIcon className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
          )}
        </button>
      </h3>
      {open ? (
        <ul id={panelId} className="mt-3 space-y-2.5">
          {options.map((option) => {
            const id = `${panelId}-${option.value}`;
            return (
              <li key={option.value} className="flex items-center gap-2.5">
                <Checkbox
                  id={id}
                  checked={selected.includes(option.value)}
                  onCheckedChange={() => onToggle(option.value)}
                />
                <label
                  htmlFor={id}
                  className="text-foreground/90 hover:text-foreground cursor-pointer text-sm transition-colors"
                >
                  {option.label}
                </label>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

/**
 * Tours filter facets (Destination · Duration · Travel style · Theme) — presentational checkbox
 * groups; the parent owns the state and supplies the destination option list. Shared by the desktop
 * sidebar and the mobile drawer.
 */
export function ToursFilters({
  value,
  onToggle,
  onClearAll,
  destinationOptions,
  categoryOptions,
  activeCount,
}: {
  value: ToursFilterState;
  onToggle: (facet: FacetKey, optionValue: string) => void;
  onClearAll: () => void;
  destinationOptions: string[];
  categoryOptions: Option[];
  activeCount: number;
}) {
  const t = messages.toursPage;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold">{t.filtersLabel}</h2>
        {activeCount > 0 ? (
          <Button variant="link" onClick={onClearAll} className="h-auto p-0">
            {t.clearAll}
          </Button>
        ) : null}
      </div>

      {categoryOptions.length > 0 ? (
        <FacetGroup
          heading={t.facets.category}
          options={categoryOptions}
          selected={value.categories}
          onToggle={(v) => onToggle('categories', v)}
        />
      ) : null}
      <FacetGroup
        heading={t.facets.destination}
        options={destinationOptions.map((d) => ({ value: d, label: d }))}
        selected={value.destinations}
        onToggle={(v) => onToggle('destinations', v)}
      />
      <FacetGroup
        heading={t.facets.duration}
        options={DURATIONS.map((d) => ({ value: d, label: t.durationLabels[d] }))}
        selected={value.durations}
        onToggle={(v) => onToggle('durations', v)}
      />
      {/* Travel style + Theme facets are intentionally omitted: the API doesn't model these tags
          yet (see web-real-data spec). Re-add once the Tour schema carries travelStyles/themes. */}
      <FacetGroup
        heading={t.facets.price}
        options={PRICES.map((p) => ({ value: p, label: t.priceLabels[p] }))}
        selected={value.prices}
        onToggle={(v) => onToggle('prices', v)}
      />
    </div>
  );
}

export default ToursFilters;
