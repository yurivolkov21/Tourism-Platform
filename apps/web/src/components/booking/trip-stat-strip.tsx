import { ClockIcon, UsersIcon, WalletIcon } from 'lucide-react';

import { NumberTicker } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import type { BookingDto } from '../../lib/api/booking';
import { tripLengthDays } from '../../lib/booking/countdown';
import { currencyPrefix } from './order-summary';

function Stat({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-1 px-2 text-center">
      <span className="text-primary" aria-hidden="true">
        {icon}
      </span>
      <span className="font-heading text-2xl font-semibold tabular-nums">
        {children}
      </span>
      <span className="text-muted-foreground text-xs tracking-wide uppercase">
        {label}
      </span>
    </div>
  );
}

/**
 * At-a-glance row at the foot of the hero — trip length · travellers · total paid. Every value comes
 * off the booking DTO (nothing fetched, nothing invented) and the money counts up on mount.
 *
 * Surface-less on purpose: no card, no border, no background. It sits inside `CheckoutHero`, down
 * where the photo has already dissolved into the page, so it reads as part of that one surface — a
 * panel here would re-introduce exactly the hard edge the dissolve exists to remove. Hairline
 * dividers carry the grouping instead.
 *
 * Deliberately NOT carrying a days-to-departure tile: the hero already owns that number as its
 * centrepiece, and repeating it here both duplicated the figure and blunted it.
 */
export function TripStatStrip({ booking }: { booking: BookingDto }) {
  const t = messages.booking.success.stats;
  const travellers = booking.numAdults + booking.numChildren;
  const total = Number(booking.totalAmount);
  const length = tripLengthDays(
    booking.departure.startDate,
    booking.departure.endDate,
  );

  return (
    <div className="divide-border/50 grid grid-cols-3 divide-x">
      <Stat icon={<ClockIcon className="size-5" />} label={t.tripLength}>
        {t.dayCount(length)}
      </Stat>
      <Stat icon={<UsersIcon className="size-5" />} label={t.travellers}>
        {travellers}
      </Stat>
      <Stat icon={<WalletIcon className="size-5" />} label={t.totalPaid}>
        <NumberTicker
          value={total}
          prefix={currencyPrefix(booking.currency)}
          // Match `formatPrice`'s face: whole amounts stay whole, cents only when there are cents.
          decimals={Number.isInteger(total) ? 0 : 2}
          durationMs={1200}
        />
      </Stat>
    </div>
  );
}

export default TripStatStrip;
