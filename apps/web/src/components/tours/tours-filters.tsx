'use client';

import type { DurationBucket, TourTheme, TravelStyle } from '@tourism/core';

import { Checkbox } from '@tourism/ui';
import { messages } from '@tourism/i18n';

export interface ToursFilterState {
  destinations: string[];
  durations: DurationBucket[];
  styles: TravelStyle[];
  themes: TourTheme[];
}

export type FacetKey = keyof ToursFilterState;

const DURATIONS: DurationBucket[] = ['1', '2-3', '4+'];
const STYLES: TravelStyle[] = ['family', 'couples', 'adventure', 'luxury', 'group', 'private'];
const THEMES: TourTheme[] = ['cruise', 'trekking', 'cultural', 'culinary', 'beach', 'nature'];

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
  return (
    <fieldset>
      <legend className="font-sans mb-3 text-sm font-semibold tracking-wide uppercase">
        {heading}
      </legend>
      <ul className="space-y-2.5">
        {options.map((option) => (
          <li key={option.value}>
            <label className="text-foreground/90 hover:text-foreground flex cursor-pointer items-center gap-2.5 text-sm transition-colors">
              <Checkbox
                checked={selected.includes(option.value)}
                onCheckedChange={() => onToggle(option.value)}
              />
              {option.label}
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
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
  activeCount,
}: {
  value: ToursFilterState;
  onToggle: (facet: FacetKey, optionValue: string) => void;
  onClearAll: () => void;
  destinationOptions: string[];
  activeCount: number;
}) {
  const t = messages.toursPage;

  return (
    <div className="space-y-7">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold">{t.filtersLabel}</h2>
        {activeCount > 0 ? (
          <button
            type="button"
            onClick={onClearAll}
            className="text-primary text-sm font-medium hover:underline"
          >
            {t.clearAll}
          </button>
        ) : null}
      </div>

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
      <FacetGroup
        heading={t.facets.travelStyle}
        options={STYLES.map((s) => ({ value: s, label: t.styleLabels[s] }))}
        selected={value.styles}
        onToggle={(v) => onToggle('styles', v)}
      />
      <FacetGroup
        heading={t.facets.theme}
        options={THEMES.map((th) => ({ value: th, label: t.themeLabels[th] }))}
        selected={value.themes}
        onToggle={(v) => onToggle('themes', v)}
      />
    </div>
  );
}

export default ToursFilters;
