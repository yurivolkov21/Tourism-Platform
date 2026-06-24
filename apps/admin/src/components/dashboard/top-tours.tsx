import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@tourism/ui';

import type { DashboardStats } from '../../lib/dashboard/stats';

const money = (v: string) => `$${Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

/** Top tours by paid revenue, driven by `topToursByRevenue`. */
export function TopTours({ rows }: { rows: DashboardStats['topToursByRevenue'] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top tours by revenue</CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        {rows.length === 0 ? (
          <p className="text-muted-foreground px-6 pb-4 text-sm">No paid bookings yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Tour</TableHead>
                  <TableHead>Bookings</TableHead>
                  <TableHead className="pr-6 text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.tourId}>
                    <TableCell className="pl-6 font-medium">{r.title}</TableCell>
                    <TableCell>{r.bookingsCount}</TableCell>
                    <TableCell className="pr-6 text-right font-semibold">{money(r.revenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default TopTours;
