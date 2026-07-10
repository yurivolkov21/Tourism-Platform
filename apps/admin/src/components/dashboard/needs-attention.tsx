import Link from 'next/link';
import { ArrowRight, Inbox, MessageSquareQuote } from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@tourism/ui';

/** Operational queues — what's waiting on an admin right now. */
export function NeedsAttention({
  counts,
}: {
  counts: { reviews: number; enquiries: number };
}) {
  const tiles = [
    {
      key: 'reviews',
      label: 'Pending reviews',
      count: counts.reviews,
      href: '/reviews',
      icon: MessageSquareQuote,
      blurb: 'awaiting approval',
    },
    {
      key: 'enquiries',
      label: 'New enquiries',
      count: counts.enquiries,
      href: '/enquiries?status=NEW',
      icon: Inbox,
      blurb: 'not yet contacted',
    },
  ] as const;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Needs attention</CardTitle>
        <CardDescription>Queues waiting on you.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          const allClear = tile.count === 0;
          return (
            <Link
              key={tile.key}
              href={tile.href}
              className="hover:bg-muted/60 group flex items-center justify-between gap-4 rounded-lg border p-3 transition-colors"
            >
              <span className="flex items-center gap-3">
                <Icon className="text-muted-foreground size-4" aria-hidden />
                <span className="text-sm">
                  <span className="block font-medium">{tile.label}</span>
                  <span className="text-muted-foreground block text-xs">
                    {allClear ? 'All clear' : tile.blurb}
                  </span>
                </span>
              </span>
              <span className="flex items-center gap-2">
                <span
                  className={
                    allClear
                      ? 'text-muted-foreground text-lg font-semibold tabular-nums'
                      : 'text-lg font-semibold tabular-nums'
                  }
                >
                  {tile.count}
                </span>
                <ArrowRight
                  className="text-muted-foreground size-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </span>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default NeedsAttention;
