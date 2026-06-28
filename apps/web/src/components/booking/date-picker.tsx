'use client';

import { useState } from 'react';
import { CalendarIcon } from 'lucide-react';

import { Calendar, Card, CardContent, CardHeader, Input } from '@tourism/ui';

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

/**
 * Inline calendar + a typeable date input, kept in sync (type or click). Future-only, with a
 * month/year dropdown for quick jumps. Emits a `YYYY-MM-DD` string. (Adapted from the Shadcn
 * "Calendar with date input" pattern.)
 */
export function DatePicker({
  value,
  onChange,
  id,
}: {
  value?: string;
  onChange: (iso: string) => void;
  id?: string;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selected = value ? new Date(`${value}T00:00:00`) : undefined;
  const [month, setMonth] = useState<Date>(selected ?? today);

  const handleSelect = (date?: Date) => {
    if (!date) {
      onChange('');
      return;
    }
    onChange(toISO(date));
    setMonth(date);
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    onChange(next);
    if (next) {
      const parsed = new Date(`${next}T00:00:00`);
      if (!Number.isNaN(parsed.getTime())) setMonth(parsed);
    }
  };

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="border-b px-3 py-3">
        <div className="relative">
          <Input
            id={id}
            type="date"
            min={toISO(today)}
            value={value ?? ''}
            onChange={handleInput}
            aria-label="Enter a date"
            className="peer pl-9 [&::-webkit-calendar-picker-indicator]:hidden"
          />
          <div className="text-muted-foreground/80 pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <CalendarIcon className="size-4" aria-hidden />
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 py-3">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={handleSelect}
          month={month}
          onMonthChange={setMonth}
          disabled={{ before: today }}
          captionLayout="dropdown"
          startMonth={today}
          endMonth={new Date(today.getFullYear() + 2, 11)}
          className="mx-auto bg-transparent p-0"
        />
      </CardContent>
    </Card>
  );
}

export default DatePicker;
