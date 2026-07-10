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

/**
 * 4 KPI cards — ported 1:1 from shadcn dashboard-01 SectionCards (gradient card surface,
 * top-right trend badge, two-line footer). Trends are REAL month-over-month deltas (the
 * upstream block hardcodes demo numbers); the badge + trend line show only when a prior
 * month exists to compare against.
 */
export function SectionCards({ cards }: { cards: CardModel[] }) {
  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:shadow-xs sm:grid-cols-2 lg:px-6 xl:grid-cols-4">
      {cards.map((c) => {
        const up = (c.delta ?? 0) >= 0;
        const Icon = up ? TrendingUp : TrendingDown;
        const pct =
          c.delta === null
            ? null
            : `${up ? '+' : ''}${Math.round(c.delta * 100)}%`;
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
                    <Icon className="size-3.5" aria-hidden />
                    {pct}
                  </Badge>
                </CardAction>
              ) : null}
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              {pct !== null ? (
                <div className="line-clamp-1 flex gap-2 font-medium">
                  {up ? 'Up' : 'Down'} {Math.abs(Math.round(c.delta! * 100))}%
                  this month
                  <Icon className="size-4" aria-hidden />
                </div>
              ) : null}
              <div className="text-muted-foreground">{c.descriptor}</div>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}

export default SectionCards;
