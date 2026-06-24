'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

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

const config: ChartConfig = { bookings: { label: 'Bookings', color: 'var(--color-chart-1)' } };

/** Monthly bookings bar chart, driven by `monthlyTrend`. */
export function TrendBar({ data }: { data: DashboardStats['monthlyTrend'] }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Bookings over time</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-[280px] w-full">
          <BarChart data={data} accessibilityLayer>
            <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={12}
              tickFormatter={(v: string) => v.slice(5)}
            />
            <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} width={28} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="bookings" fill="var(--color-bookings)" radius={[4, 4, 0, 0]} barSize={28} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

export default TrendBar;
