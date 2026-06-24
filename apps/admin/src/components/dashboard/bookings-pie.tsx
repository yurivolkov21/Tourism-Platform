'use client';

import { Label, Pie, PieChart } from 'recharts';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@tourism/ui';

import type { DashboardStats } from '../../lib/dashboard/stats';

const STATUSES = ['PAID', 'PENDING', 'CANCELLED', 'REFUNDED'] as const;
const COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
];

const config: ChartConfig = Object.fromEntries(
  STATUSES.map((s, i) => [s, { label: `${s[0]}${s.slice(1).toLowerCase()}`, color: COLORS[i] }]),
);

/** Booking mix donut, driven by `bookingsByStatus`. */
export function BookingsPie({ data }: { data: DashboardStats['bookingsByStatus'] }) {
  const rows = STATUSES.map((status, i) => ({ status, count: data[status] ?? 0, fill: COLORS[i] }));
  const total = rows.reduce((acc, r) => acc + r.count, 0);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Bookings by status</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="mx-auto aspect-square max-h-[240px]">
          <PieChart>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Pie data={rows} dataKey="count" nameKey="status" innerRadius={58} strokeWidth={4}>
              <Label
                content={({ viewBox }) =>
                  viewBox && 'cx' in viewBox ? (
                    <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                      <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-2xl font-bold">
                        {total}
                      </tspan>
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy ?? 0) + 20}
                        className="fill-muted-foreground text-xs"
                      >
                        bookings
                      </tspan>
                    </text>
                  ) : null
                }
              />
            </Pie>
          </PieChart>
        </ChartContainer>

        <ul className="mt-4 space-y-2">
          {rows.map((r) => (
            <li key={r.status} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className="size-2.5 rounded-full" style={{ background: r.fill }} />
                <span className="capitalize">{r.status.toLowerCase()}</span>
              </span>
              <span className="font-medium">{r.count}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export default BookingsPie;
