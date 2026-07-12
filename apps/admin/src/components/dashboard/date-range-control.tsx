'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, type ComponentProps } from 'react';

import {
  Button,
  Calendar,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@tourism/ui';

import { TabPills } from '../crud/tab-pills';
import {
  matchPreset,
  presetRange,
  type RangePreset,
} from '../../lib/dashboard/date-range';

// `Calendar`'s prop union is discriminated on `mode`; deriving the range-selection type off it
// (rather than importing `react-day-picker` directly, which isn't a declared admin dependency —
// it's only `@tourism/ui`'s) keeps the local draft state exactly assignable to `selected`/`onSelect`.
type CalendarRangeProps = Extract<
  ComponentProps<typeof Calendar>,
  { mode: 'range' }
>;
type DateRange = NonNullable<CalendarRangeProps['selected']>;

const PRESET_TABS: { value: RangePreset; label: string }[] = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: 'month', label: 'This month' },
  { value: 'all', label: 'All time' },
];

/** `YYYY-MM-DD` from a Date's LOCAL calendar fields — never `toISOString`, which can shift the day. */
function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function fromDateStr(iso?: string): Date | undefined {
  if (!iso) return undefined;
  const [y, m, d] = iso.split('-').map(Number);
  const parsed = new Date(y, m - 1, d);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function formatDisplay(iso?: string): string {
  const d = fromDateStr(iso);
  if (!d) return '';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Dashboard date-range toolbar: preset `TabPills` (7/30/90 days, this month, all time) plus a
 * Custom popover with a `Calendar mode="range"` picker. Both write `?from&to` to the URL
 * (bookings-filters `pushWith` pattern) — the page re-fetches stats server-side on navigation.
 * Preset math and the active-pill match both run through the pure `lib/dashboard/date-range`
 * helpers so a deep-linked `?from&to` that happens to equal a preset's range highlights it.
 */
export function DateRangeControl({ from, to }: { from?: string; to?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>({
    from: fromDateStr(from),
    to: fromDateStr(to),
  });

  // `today` is resolved after mount only: the SSR pass runs on a UTC clock,
  // so classifying the URL against the admin's LOCAL calendar date during
  // render would hydration-mismatch near midnight/month edges. Until mounted,
  // fall back to a rule that is deterministic on both sides (any range =
  // 'custom'); the effect then upgrades it to real preset detection.
  const [today, setToday] = useState<Date | null>(null);
  useEffect(() => {
    setToday(new Date());
  }, []);
  const active: RangePreset | 'custom' = today
    ? matchPreset(from, to, today)
    : from || to
      ? 'custom'
      : 'all';

  const pushWith = (next: { from?: string; to?: string }) => {
    const qs = new URLSearchParams(params.toString());
    if (next.from) qs.set('from', next.from);
    else qs.delete('from');
    if (next.to) qs.set('to', next.to);
    else qs.delete('to');
    const s = qs.toString();
    router.push(s ? `${pathname}?${s}` : pathname);
  };

  const handlePreset = (preset: RangePreset) => {
    // Event handlers only run post-mount — a fresh Date also survives a
    // dashboard left open across midnight.
    pushWith(presetRange(preset, new Date()));
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) setDraft({ from: fromDateStr(from), to: fromDateStr(to) });
  };

  const handleApply = () => {
    if (!draft?.from || !draft.to) return;
    pushWith({ from: toDateStr(draft.from), to: toDateStr(draft.to) });
    setOpen(false);
  };

  const handleClear = () => {
    setDraft(undefined);
    pushWith({});
    setOpen(false);
  };

  const triggerLabel =
    active === 'custom' && from && to
      ? `${formatDisplay(from)} – ${formatDisplay(to)}`
      : 'Custom range';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <TabPills<RangePreset | 'custom'>
        tabs={PRESET_TABS}
        value={active}
        ariaLabel="Filter by date range"
        onValueChange={(preset) => {
          if (preset !== 'custom') handlePreset(preset);
        }}
      />
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger
          render={<Button variant="outline" className="font-normal" />}
        >
          {triggerLabel}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="range"
            selected={draft}
            onSelect={setDraft}
            captionLayout="dropdown"
            endMonth={today ?? undefined}
          />
          <div className="flex items-center justify-end gap-2 border-t p-2.5">
            <Button variant="ghost" size="sm" onClick={handleClear}>
              Clear
            </Button>
            <Button
              size="sm"
              onClick={handleApply}
              disabled={!draft?.from || !draft.to}
            >
              Apply
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default DateRangeControl;
