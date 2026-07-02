'use client';

import { useState } from 'react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';

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

// Revenue and bookings live on different scales (single digits vs $ hundreds), so they are never
// stacked — the toggle shows ONE metric at a time instead.
const chartConfig = {
  revenue: { label: 'Revenue', color: 'var(--primary)' },
  bookings: { label: 'Bookings', color: 'var(--chart-2)' },
} satisfies ChartConfig;

type Metric = keyof typeof chartConfig;

const METRIC_META: Record<Metric, { title: string; blurb: string }> = {
  revenue: { title: 'Revenue', blurb: 'Paid revenue' },
  bookings: { title: 'Bookings', blurb: 'Bookings created' },
};

const RANGE_LABEL: Record<DailyRange, string> = {
  '90d': 'Last 3 months',
  '30d': 'Last 30 days',
  '7d': 'Last 7 days',
};

export function ChartAreaInteractive({ daily }: { daily: DashboardStats['dailyTrend'] }) {
  const [range, setRange] = useState<DailyRange>('90d');
  const [metric, setMetric] = useState<Metric>('revenue');
  const data = sliceDailyTrend(daily, range).map((d) => ({
    date: d.date,
    revenue: Number(d.revenue),
    bookings: d.bookings,
  }));

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>{METRIC_META[metric].title}</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">{`${METRIC_META[metric].blurb} — ${RANGE_LABEL[range].toLowerCase()}`}</span>
          <span className="@[540px]/card:hidden">{RANGE_LABEL[range]}</span>
        </CardDescription>
        <CardAction>
          <div className="flex flex-wrap items-center gap-2">
            <ToggleGroup
              value={[metric]}
              onValueChange={(v) => {
                const next = v[0] as Metric | undefined;
                if (next) setMetric(next);
              }}
              variant="outline"
            >
              <ToggleGroupItem value="revenue" className="px-3">Revenue</ToggleGroupItem>
              <ToggleGroupItem value="bookings" className="px-3">Bookings</ToggleGroupItem>
            </ToggleGroup>
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
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-62.5 w-full">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`fill-${metric}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={`var(--color-${metric})`} stopOpacity={1.0} />
                <stop offset="95%" stopColor={`var(--color-${metric})`} stopOpacity={0.1} />
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
            {/* Clamp the scale at 0 so the fill can never render below the baseline. */}
            <YAxis domain={[0, 'auto']} hide />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent labelFormatter={(value) => formatDay(String(value))} indicator="dot" />}
            />
            {/* `monotone` (shape-preserving cubic) stays smooth but never overshoots — so spiky daily
                revenue doesn't dip below 0 or round off its peaks, unlike `natural`. */}
            <Area
              key={metric}
              dataKey={metric}
              type="monotone"
              fill={`url(#fill-${metric})`}
              stroke={`var(--color-${metric})`}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

export default ChartAreaInteractive;
