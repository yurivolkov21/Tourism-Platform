import { cn } from '@tourism/ui';

import { formatRelativeTime, type TimelineStep } from '../../lib/bookings/detail';

/** Absolute "15 Aug 2026, 10:30" for a timeline node. */
function absolute(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
}

/** Vertical lifecycle stepper: filled dots for reached steps, a hollow dot for a pending one. */
export function BookingTimeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <ol className="space-y-4">
      {steps.map((step, i) => (
        <li key={step.key} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span
              className={cn(
                'mt-0.5 size-2.5 shrink-0 rounded-full ring-2',
                step.done ? 'bg-primary ring-primary/25' : 'bg-muted ring-border',
              )}
              aria-hidden
            />
            {i < steps.length - 1 ? <span className="bg-border mt-1 w-px flex-1" aria-hidden /> : null}
          </div>
          <div className="-mt-0.5 pb-1">
            <p
              className={cn(
                'text-sm font-medium',
                step.done ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {step.label}
            </p>
            {step.at ? (
              <p className="text-muted-foreground text-xs">
                {absolute(step.at)} · {formatRelativeTime(step.at)}
              </p>
            ) : (
              <p className="text-muted-foreground text-xs">Pending</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

export default BookingTimeline;
