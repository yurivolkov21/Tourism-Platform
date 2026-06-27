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
 * Base UI resolves the *closed* trigger's label from the `items` prop, so we pass it (otherwise the
 * trigger renders the raw value — the departure UUID — instead of the date).
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
  const items = departures.map((d) => ({
    value: d.id,
    label: `${d.label} · ${messages.tourDetail.booking.seatsLeft(d.seatsLeft)}`,
  }));

  return (
    <Select items={items} value={value} onValueChange={(v) => onChange(String(v))}>
      <SelectTrigger className="w-full" aria-label={messages.booking.form.departure}>
        <SelectValue placeholder={t.selectDeparture} />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default DeparturePicker;
