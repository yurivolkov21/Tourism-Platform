import Image from 'next/image';
import { CheckCircle2Icon, Loader2Icon } from 'lucide-react';

import { NumberTicker } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import type { BookingDto } from '../../lib/api/booking';
import type { TripEssentials } from '../../lib/api/trip-essentials';
import { daysUntilDeparture } from '../../lib/booking/countdown';
import { CheckoutCelebration } from './checkout-celebration';
import { TripStatStrip } from './trip-stat-strip';

/** The emotional headline: a counted-up "N days until you go", or the phrase for a trip that has
 * already started/finished. Rendered for PENDING too — the departure date is a fact either way, and
 * keeping it stops the layout jumping the moment the webhook flips the booking to PAID. */
function Countdown({
  startDate,
  endDate,
}: {
  startDate: string;
  endDate: string;
}) {
  const t = messages.booking.success.countdown;
  const { kind, days } = daysUntilDeparture(startDate, endDate);

  const phrase =
    kind === 'today'
      ? t.today
      : kind === 'ongoing'
        ? t.ongoing
        : kind === 'past'
          ? t.past
          : days === 1
            ? t.tomorrow
            : null;

  // Sits in the hero's right-hand column: a hairline on the left divides it from the copy on wide
  // screens (editorial rule, not a boxed panel); on mobile the columns stack and the rule turns
  // horizontal so the number still reads as its own beat.
  return (
    <div className="border-on-media/20 mt-8 border-t pt-8 sm:mt-0 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-8">
      {phrase ? (
        <p className="font-heading text-2xl font-semibold text-balance sm:text-3xl">
          {phrase}
        </p>
      ) : (
        <>
          <NumberTicker
            value={days}
            durationMs={1400}
            className="font-heading block text-7xl leading-[0.85] font-bold tabular-nums sm:text-8xl"
          />
          <p className="text-on-media/70 mt-3 text-xs tracking-[0.2em] uppercase">
            {t.upcomingSuffix}
          </p>
        </>
      )}
    </div>
  );
}

/**
 * Full-bleed status hero for `/checkout/success`: the tour photo on a slow Ken Burns drift, a
 * layered scrim, the confirmation status, and the days-to-departure countdown. A PAID booking also
 * mounts a one-shot confetti burst (`CheckoutCelebration`).
 *
 * Falls back to a themed gradient when the tour's image is unavailable (deleted media, or `trip` is
 * `null` because the lookup failed) — the confirmation must never look broken over a missing image.
 */
export function CheckoutHero({
  booking,
  trip,
}: {
  booking: BookingDto;
  trip: TripEssentials | null;
}) {
  const t = messages.booking.success;
  const paid = booking.status === 'PAID';

  return (
    // Only the TOP corners are rounded: the foot has no edge to round, because the photo dissolves
    // into the page rather than stopping at a line.
    <section className="relative isolate overflow-hidden rounded-t-2xl">
      {trip?.image ? (
        <Image
          src={trip.image}
          alt={trip.imageAlt ?? ''}
          fill
          sizes="100vw"
          priority
          className="nx-kenburns -z-10 object-cover"
        />
      ) : (
        <div className="from-primary/40 to-primary/10 absolute inset-0 -z-10 bg-gradient-to-br" />
      )}
      {/* Scrim, in two passes: bottom-weighted so the copy stays legible without flattening the photo
          to a grey wash, then left-weighted to sit under the headline column specifically. This
          matters more than usual — the photo is whatever the tour ships, so the text has to survive
          a bright one. */}
      <div className="from-overlay/90 via-overlay/65 to-overlay/40 absolute inset-0 -z-10 bg-gradient-to-t" />
      <div className="from-overlay/70 absolute inset-0 -z-10 bg-gradient-to-r to-transparent" />

      {/* The dissolve. A fixed-height band pinned to the foot ramps the photo into the page's own
          background colour, so there is no seam between "image" and "panel" — they are one surface.
          Anchored to the bottom (not a percentage of the section) so it stays put however tall the
          copy runs, and it lands the stat row on effectively solid background, which is what keeps
          that text at full contrast over an arbitrary admin-supplied photo. */}
      <div className="from-background via-background/85 absolute inset-x-0 bottom-0 -z-10 h-80 bg-gradient-to-t to-transparent" />

      {paid && <CheckoutCelebration bookingCode={booking.code} />}

      {/* Asymmetric editorial composition: the confirmation copy holds the left, the countdown
          answers it on the right, baselines aligned. Centring everything is what made this read as a
          template rather than a magazine spread. */}
      <div className="relative mx-auto max-w-3xl px-6 pt-16 sm:pt-20">
        <div className="text-on-media grid gap-8 sm:grid-cols-[1fr_auto] sm:items-end sm:gap-10">
          <div role="status" aria-live="polite">
            <div className="flex items-center gap-3">
              {paid ? (
                <CheckCircle2Icon
                  className="size-6 shrink-0"
                  aria-hidden="true"
                />
              ) : (
                <Loader2Icon
                  className="size-6 shrink-0 animate-spin"
                  aria-hidden="true"
                />
              )}
              <span className="border-on-media/30 bg-on-media/10 inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium backdrop-blur-sm">
                {t.heroBadge(booking.code)}
              </span>
            </div>

            <h1 className="font-heading mt-5 text-4xl font-semibold text-balance sm:text-5xl">
              {paid ? t.confirmedTitle : t.pendingTitle}
            </h1>
            <p className="text-on-media/80 mt-3 max-w-md text-pretty">
              {paid ? t.confirmedBody : t.pendingBody}
            </p>
          </div>

          <Countdown
            startDate={booking.departure.startDate}
            endDate={booking.departure.endDate}
          />
        </div>

        {/* Lives INSIDE the hero, down in the dissolved zone — no card, no border, so there is no
            second rectangle to draw a boundary against. The generous top padding is what puts it far
            enough down the fade to sit on solid background. */}
        <div className="pt-24 pb-10">
          <TripStatStrip booking={booking} />
        </div>
      </div>
    </section>
  );
}

export default CheckoutHero;
