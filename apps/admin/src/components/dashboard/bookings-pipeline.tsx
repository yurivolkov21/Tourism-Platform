import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@tourism/ui';

import {
  bookingsPipeline,
  type PipelineStatus,
} from '../../lib/dashboard/transforms';

const DOT_CLASS: Record<PipelineStatus, string> = {
  PENDING: 'bg-amber-500',
  PAID: 'bg-emerald-600',
  CANCELLED: 'bg-muted-foreground',
  REFUNDED: 'bg-sky-600',
  PARTIALLY_REFUNDED: 'bg-violet-500',
};

/** Bookings-by-status breakdown — counts + share bars in a fixed pipeline order. */
export function BookingsPipeline({
  byStatus,
}: {
  byStatus: Record<PipelineStatus, number>;
}) {
  const rows = bookingsPipeline(byStatus);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Bookings pipeline</CardTitle>
        <CardDescription>All bookings to date, by status.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.map((row) => (
          <div key={row.status} className="space-y-1.5">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="inline-flex items-center gap-2">
                <span
                  className={`size-2 rounded-full ${DOT_CLASS[row.status]}`}
                  aria-hidden
                />
                {row.label}
              </span>
              <span className="font-medium tabular-nums">{row.count}</span>
            </div>
            <div className="bg-muted h-1.5 overflow-hidden rounded-full">
              <div
                className={`h-full rounded-full ${DOT_CLASS[row.status]}`}
                style={{ width: `${Math.round(row.pct * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default BookingsPipeline;
