'use client';

import { useState } from 'react';
import { CalendarIcon } from 'lucide-react';

import {
  Button,
  Calendar,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Separator,
  cn,
} from '@tourism/ui';

import { formatTripDate } from '../../lib/booking/my-bookings';

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

const PRESETS = [
  { label: 'In 1 week', days: 7 },
  { label: 'In 2 weeks', days: 14 },
  { label: 'In 1 month', days: 30 },
] as const;

/**
 * Single-date picker (Popover + Calendar): future-only, month/year dropdown for quick jumps, and a
 * few quick presets. Emits a `YYYY-MM-DD` string. A nicer replacement for the native date input.
 */
export function DatePicker({
  value,
  onChange,
  id,
  placeholder = 'Pick a date',
}: {
  value?: string;
  onChange: (iso: string) => void;
  id?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selected = value ? new Date(`${value}T00:00:00`) : undefined;

  const pick = (date?: Date) => {
    if (!date) return;
    onChange(toISO(date));
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            className={cn(
              'w-full justify-start gap-2 font-normal',
              !value && 'text-muted-foreground',
            )}
          />
        }
      >
        <CalendarIcon className="size-4" />
        {value ? formatTripDate(value) : placeholder}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected ?? today}
          onSelect={pick}
          disabled={{ before: today }}
          captionLayout="dropdown"
          startMonth={today}
          endMonth={new Date(today.getFullYear() + 2, 11)}
        />
        <Separator />
        <div className="flex flex-wrap gap-1.5 p-2">
          {PRESETS.map((p) => (
            <Button
              key={p.days}
              type="button"
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => pick(addDays(today, p.days))}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default DatePicker;
