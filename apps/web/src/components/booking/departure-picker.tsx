'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@tourism/ui';
import { messages } from '@tourism/i18n';

import type { DepartureOption } from '../../lib/api/booking';

/**
 * Controlled departure dropdown (UX only — the parent form posts the value via a hidden input, so the
 * Select stays presentational and also drives the live price). Each option shows the date + seats left.
 */
export function DeparturePicker({
  departures,
  value,
  onChange,
}: {
  departures: DepartureOption[];
  value: string;
  onChange: (id: string) => void;
}) {
  const t = messages.booking.box;

  return (
    <Select value={value} onValueChange={(v) => onChange(String(v))}>
      <SelectTrigger className="w-full" aria-label={messages.booking.form.departure}>
        <SelectValue placeholder={t.selectDeparture} />
      </SelectTrigger>
      <SelectContent>
        {departures.map((d) => (
          <SelectItem key={d.id} value={d.id}>
            {d.label} · {messages.tourDetail.booking.seatsLeft(d.seatsLeft)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default DeparturePicker;
