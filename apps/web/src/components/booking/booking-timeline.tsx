import { CheckIcon, CircleIcon, XIcon } from 'lucide-react';

import { Card, CardContent, Progress, cn } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import type { BookingDto } from '../../lib/api/booking';
import { formatTripDate } from '../../lib/booking/my-bookings';
import {
  buildBookingTimeline,
  type TimelineStep,
  type TimelineStepState,
} from '../../lib/booking/timeline';

// Token-only tones per step state (no hex — theme-aware in both modes).
const MARKER_TONES: Record<TimelineStepState, string> = {
  done: 'border-success/40 bg-success/15 text-success',
  current: 'border-primary bg-primary text-primary-foreground',
  upcoming: 'border-border bg-muted text-muted-foreground',
  stopped: 'border-destructive/40 bg-destructive/15 text-destructive',
};

const RAIL_TONES: Record<TimelineStepState, string> = {
  done: 'bg-success/40',
  current: 'bg-primary/40',
  upcoming: 'bg-border',
  stopped: 'bg-destructive/40',
};

function StepMarker({ state }: { state: TimelineStepState }) {
  return (
    <span
      className={cn(
        'relative isolate flex size-8 shrink-0 items-center justify-center rounded-full border',
        MARKER_TONES[state],
        // Only the live step breathes — a rail where everything pulses points at nothing.
        state === 'current' && 'nx-pulse',
      )}
      aria-hidden="true"
    >
      {state === 'done' ? (
        <CheckIcon className="size-4" />
      ) : state === 'stopped' ? (
        <XIcon className="size-4" />
      ) : (
        <CircleIcon
          className={cn('size-2.5', state === 'current' && 'fill-current')}
        />
      )}
    </span>
  );
}

/**
 * Read-only progress rail for a booking — where the trip has got to, at a glance. Stacked on
 * mobile, horizontal from `md` (the layout that reads in one sweep on a desktop). Steps come from
 * `buildBookingTimeline` (pure, tested); a cancelled/refunded booking stops at a terminal end-cap
 * rather than showing steps that will never happen — and then the progress bar is dropped too,
 * because a stopped booking has no progress left to report.
 */
export function BookingTimeline({ booking }: { booking: BookingDto }) {
  const t = messages.booking.success.timeline;
  const steps = buildBookingTimeline(booking);

  const stopped = steps.some((s) => s.state === 'stopped');
  const doneCount = steps.filter((s) => s.state === 'done').length;
  const currentIndex = steps.findIndex((s) => s.state === 'current');
  const stepNumber = currentIndex >= 0 ? currentIndex + 1 : steps.length;

  return (
    <Card>
      <CardContent className="p-6 sm:p-8">
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="font-heading text-xl font-semibold">{t.heading}</h2>
          {!stopped && (
            <span className="text-muted-foreground text-sm tabular-nums">
              {t.stepOf(stepNumber, steps.length)}
            </span>
          )}
        </div>

        {!stopped && (
          <Progress
            value={(doneCount / steps.length) * 100}
            className="mb-8 h-1.5"
          />
        )}

        <ol className="md:flex md:items-start">
          {steps.map((step: TimelineStep, index) => {
            const last = index === steps.length - 1;
            const { title, body } = t[step.key];
            // The connector belongs to the step it leads TO, so it carries that step's tone.
            const railTone = last ? '' : RAIL_TONES[steps[index + 1].state];
            return (
              <li
                key={step.key}
                // Mobile: marker column beside the copy. Desktop: marker row on top, copy beneath —
                // every step an equal share of the width so the rail reads as one continuous track.
                className="flex min-w-0 flex-1 gap-4 md:flex-col md:gap-0"
              >
                <div className="flex flex-col items-center md:w-full md:flex-row">
                  <StepMarker state={step.state} />
                  {!last && (
                    <span
                      className={cn(
                        'nx-rail w-px flex-1 md:h-px md:w-auto md:flex-1',
                        railTone,
                      )}
                      style={{ animationDelay: `${index * 120}ms` }}
                      aria-hidden="true"
                    />
                  )}
                </div>

                <div
                  className={cn(
                    'min-w-0',
                    last ? 'pb-0' : 'pb-6',
                    'md:mt-3 md:pr-4 md:pb-0',
                  )}
                >
                  <p
                    className={cn(
                      'font-medium',
                      step.state === 'upcoming' && 'text-muted-foreground',
                    )}
                  >
                    {title}
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-sm text-pretty">
                    {body}
                  </p>
                  {step.date && (
                    <p className="text-muted-foreground mt-1 text-xs">
                      {formatTripDate(step.date)}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}

export default BookingTimeline;
