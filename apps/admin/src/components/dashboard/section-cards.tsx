import { TrendingDown, TrendingUp } from 'lucide-react';

import {
  Badge,
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@tourism/ui';

import type { CardModel } from '../../lib/dashboard/transforms';

/** 4 KPI cards (dashboard-01 SectionCards), value + optional trend badge + footer line. */
export function SectionCards({ cards }: { cards: CardModel[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 sm:grid-cols-2 lg:px-6 xl:grid-cols-4">
      {cards.map((c) => {
        const up = (c.delta ?? 0) >= 0;
        const pct = c.delta === null ? null : `${up ? '+' : ''}${Math.round(c.delta * 100)}%`;
        return (
          <Card key={c.key} className="@container/card">
            <CardHeader>
              <CardDescription>{c.label}</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {c.value}
              </CardTitle>
              {pct !== null ? (
                <CardAction>
                  <Badge variant="outline">
                    {up ? (
                      <TrendingUp className="size-3.5" aria-hidden />
                    ) : (
                      <TrendingDown className="size-3.5" aria-hidden />
                    )}
                    {pct}
                  </Badge>
                </CardAction>
              ) : null}
            </CardHeader>
            <CardFooter className="text-muted-foreground flex-col items-start gap-1 text-sm">
              <span>
                {c.key === 'revenue'
                  ? 'Paid bookings revenue'
                  : c.key === 'bookings'
                    ? 'All bookings to date'
                    : c.key === 'conversion'
                      ? 'Paid ÷ total bookings'
                      : 'Revenue per paid booking'}
              </span>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}

export default SectionCards;
