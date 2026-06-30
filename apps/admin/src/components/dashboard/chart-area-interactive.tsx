'use client';

import { useState } from 'react';
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  ToggleGroup,
  ToggleGroupItem,
} from '@tourism/ui';

import type { DashboardStats } from '../../lib/dashboard/stats';
import { formatDay, sliceDailyTrend, type DailyRange } from '../../lib/dashboard/transforms';

// Revenue is the area series. Bookings live on a different scale (single digits vs $ hundreds), so
// stacking them — as dashboard-01 does for its two same-scale series — would flatten bookings to an
// invisible line. The booking count is surfaced in the KPI cards instead.
const chartConfig = {
  revenue: { label: 'Revenue', color: 'var(--primary)' },
} satisfies ChartConfig;

const RANGE_LABEL: Record<DailyRange, string> = {
  '90d': 'Last 3 months',
  '30d': 'Last 30 days',
  '7d': 'Last 7 days',
};

export function ChartAreaInteractive({ daily }: { daily: DashboardStats['dailyTrend'] }) {
  const [range, setRange] = useState<DailyRange>('90d');
  const data = sliceDailyTrend(daily, range).map((d) => ({ date: d.date, revenue: Number(d.revenue) }));

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Revenue</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">Paid revenue — {RANGE_LABEL[range].toLowerCase()}</span>
          <span className="@[540px]/card:hidden">{RANGE_LABEL[range]}</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            value={[range]}
            onValueChange={(v) => {
              const next = v[0] as DailyRange | undefined;
              if (next) setRange(next);
            }}
            variant="outline"
            className="hidden @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d" className="px-4">Last 3 months</ToggleGroupItem>
            <ToggleGroupItem value="30d" className="px-4">Last 30 days</ToggleGroupItem>
            <ToggleGroupItem value="7d" className="px-4">Last 7 days</ToggleGroupItem>
          </ToggleGroup>
          <Select value={range} onValueChange={(v) => setRange(v as DailyRange)}>
            <SelectTrigger className="flex w-40 @[767px]/card:hidden" size="sm" aria-label="Select a time range">
              <SelectValue placeholder="Last 3 months" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">Last 3 months</SelectItem>
              <SelectItem value="30d" className="rounded-lg">Last 30 days</SelectItem>
              <SelectItem value="7d" className="rounded-lg">Last 7 days</SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={1.0} />
                <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={formatDay}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent labelFormatter={(value) => formatDay(String(value))} indicator="dot" />}
            />
            <Area dataKey="revenue" type="natural" fill="url(#fillRevenue)" stroke="var(--color-revenue)" />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

export default ChartAreaInteractive;
