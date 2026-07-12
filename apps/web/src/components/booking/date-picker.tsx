'use client';

import * as React from 'react';
import { CalendarIcon } from 'lucide-react';

import {
  Calendar,
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@tourism/ui';
import { messages } from '@tourism/i18n';

function toISO(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

function fromISO(iso?: string): Date | undefined {
  if (!iso) return undefined;
  const parsed = new Date(`${iso}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function formatDisplay(date: Date | undefined): string {
  if (!date) return '';
  return date.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * A typeable date field with a calendar that opens from the inline button (Shadcn "date picker
 * input" pattern). You can type a date ("July 01, 2026") or pick one; both stay in sync. Future-only,
 * with a month/year dropdown for quick jumps. Emits a `YYYY-MM-DD` string.
 */
export function DatePicker({
  value,
  onChange,
  id,
  className,
}: {
  value?: string;
  onChange: (iso: string) => void;
  id?: string;
  /** Extra classes for the field shell (e.g. to match a taller form field). */
  className?: string;
}) {
  const today = React.useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const selected = fromISO(value);
  const [open, setOpen] = React.useState(false);
  const [month, setMonth] = React.useState<Date>(selected ?? today);
  const [text, setText] = React.useState(formatDisplay(selected));

  // Re-sync the text field whenever the value changes elsewhere (calendar pick, reset, pre-fill).
  React.useEffect(() => {
    setText(formatDisplay(fromISO(value)));
  }, [value]);

  const handleType = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value;
    setText(next);
    if (next.trim() === '') {
      onChange('');
      return;
    }
    const parsed = new Date(next);
    if (!Number.isNaN(parsed.getTime())) {
      parsed.setHours(0, 0, 0, 0);
      if (parsed >= today) {
        onChange(toISO(parsed));
        setMonth(parsed);
      }
    }
  };

  const handlePick = (date?: Date) => {
    if (!date) {
      onChange('');
      setText('');
      return;
    }
    onChange(toISO(date));
    setMonth(date);
    setOpen(false);
  };

  return (
    <InputGroup className={className}>
      <InputGroupInput
        id={id}
        value={text}
        placeholder={messages.booking.datePicker.placeholder}
        autoComplete="off"
        aria-label={messages.booking.datePicker.enter}
        onChange={handleType}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setOpen(true);
          }
        }}
      />
      <InputGroupAddon align="inline-end">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            render={
              <InputGroupButton
                variant="ghost"
                size="icon-xs"
                aria-label={messages.booking.datePicker.select}
              >
                <CalendarIcon />
              </InputGroupButton>
            }
          />
          <PopoverContent
            className="w-auto overflow-hidden p-0"
            align="end"
            alignOffset={-8}
            sideOffset={10}
          >
            <Calendar
              mode="single"
              selected={selected}
              month={month}
              onMonthChange={setMonth}
              onSelect={handlePick}
              disabled={{ before: today }}
              captionLayout="dropdown"
              startMonth={today}
              endMonth={new Date(today.getFullYear() + 2, 11)}
            />
          </PopoverContent>
        </Popover>
      </InputGroupAddon>
    </InputGroup>
  );
}

export default DatePicker;
