import { TrendingDown, TrendingUp } from 'lucide-react';

import {
  Badge,
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  NumberTicker,
} from '@tourism/ui';

import type { CardModel } from '../../lib/dashboard/transforms';
import { Reveal } from '../motion/reveal';

/**
 * 4 KPI cards — ported 1:1 from shadcn dashboard-01 SectionCards (gradient card surface,
 * top-right trend badge, two-line footer). Trends are REAL month-over-month deltas (the
 * upstream block hardcodes demo numbers); the badge + trend line show only when a prior
 * month exists to compare against. Cards stagger in via Reveal (the card-surface styles
 * moved off the grid's direct-child selectors onto the Card, since Reveal wraps it), and
 * the value counts up via NumberTicker (SSR renders the final value).
 */
export function SectionCards({ cards }: { cards: CardModel[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 sm:grid-cols-2 lg:px-6 xl:grid-cols-4">
      {cards.map((c, i) => {
        const up = (c.delta ?? 0) >= 0;
        const Icon = up ? TrendingUp : TrendingDown;
        const pct =
          c.delta === null
            ? null
            : `${up ? '+' : ''}${Math.round(c.delta * 100)}%`;
        return (
          <Reveal key={c.key} delay={i * 0.06}>
            <Card className="@container/card from-primary/5 to-card dark:bg-card h-full bg-linear-to-t shadow-xs">
              <CardHeader>
                <CardDescription>{c.label}</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                  <NumberTicker
                    value={c.ticker.value}
                    prefix={c.ticker.prefix}
                    suffix={c.ticker.suffix}
                    decimals={c.ticker.decimals}
                    durationMs={900}
                  />
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
          </Reveal>
        );
      })}
    </div>
  );
}

export default SectionCards;
