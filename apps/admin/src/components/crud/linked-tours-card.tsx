import Link from 'next/link';

import { Badge, Card, CardContent, CardHeader, CardTitle } from '@tourism/ui';

export interface LinkedTourItem {
  slug: string;
  title: string;
  isPublished: boolean;
  /** Only meaningful for destinations (the tour's primary destination). */
  isPrimary?: boolean;
}

/**
 * Card listing the tours linked to a destination or category. Each tour links to its admin detail
 * page; a "Draft" chip flags unpublished tours and a "Primary" chip marks a tour's primary
 * destination. Shows a count in the header and an empty hint when there are none.
 */
export function LinkedToursCard({
  tours,
  title,
  emptyText,
}: {
  tours: LinkedTourItem[];
  title: string;
  emptyText: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {title}{' '}
          <span className="text-muted-foreground font-normal tabular-nums">
            ({tours.length})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {tours.length === 0 ? (
          <p className="text-muted-foreground text-sm">{emptyText}</p>
        ) : (
          <ul className="divide-y">
            {tours.map((tour) => (
              <li
                key={tour.slug}
                className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <Link
                  href={`/tours/${tour.slug}`}
                  className="hover:text-primary truncate text-sm font-medium hover:underline"
                >
                  {tour.title}
                </Link>
                <div className="flex shrink-0 items-center gap-1.5">
                  {tour.isPrimary ? (
                    <Badge variant="outline" className="text-xs">
                      Primary
                    </Badge>
                  ) : null}
                  {!tour.isPublished ? (
                    <Badge variant="secondary" className="text-xs">
                      Draft
                    </Badge>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default LinkedToursCard;
