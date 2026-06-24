import { CalendarCheck, DollarSign, Percent, Ticket } from 'lucide-react';

import { Badge, Card, CardContent, cn } from '@tourism/ui';

import type { DashboardStats } from '../../lib/dashboard/stats';

function money(value: string, currency: string): string {
  const n = Number(value);
  const body = Number.isFinite(n) ? n.toLocaleString('en-US', { maximumFractionDigits: 0 }) : value;
  return currency === 'USD' ? `$${body}` : `${currency} ${body}`;
}
const pct = (v: number) => `${Math.round(v * 100)}%`;

/** Top KPI row, driven by `overview` from /admin/stats (revenue, bookings, paid, conversion + MoM). */
export function StatCards({ overview }: { overview: DashboardStats['overview'] }) {
  const mom = overview.monthOverMonthGrowth;
  const cards = [
    {
      title: 'Revenue',
      value: money(overview.totalRevenue, overview.currency),
      icon: DollarSign,
      badge: mom == null ? null : { text: `${mom >= 0 ? '+' : ''}${pct(mom)}`, positive: mom >= 0 },
    },
    { title: 'Bookings', value: overview.totalBookings.toLocaleString('en-US'), icon: Ticket, badge: null },
    { title: 'Paid', value: overview.paidBookings.toLocaleString('en-US'), icon: CalendarCheck, badge: null },
    { title: 'Conversion', value: pct(overview.conversionRate), icon: Percent, badge: null },
  ] as const;

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((c) => (
        <Card key={c.title}>
          <CardContent className="flex items-start justify-between gap-3 p-5">
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm">{c.title}</p>
              <div className="flex items-center gap-2">
                <p className="font-heading text-2xl font-bold">{c.value}</p>
                {c.badge ? (
                  <Badge
                    className={cn(
                      'font-normal',
                      c.badge.positive
                        ? 'bg-success/10 text-success'
                        : 'bg-destructive/10 text-destructive',
                    )}
                  >
                    {c.badge.text}
                  </Badge>
                ) : null}
              </div>
            </div>
            <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-full">
              <c.icon className="size-5" />
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default StatCards;
