import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@tourism/ui';

import type { AdminUserDetail } from '../../lib/users/data';
import { DangerZone } from './danger-zone';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** One label/value pair in the main content cards (mirrors the booking detail page's `Fact`). */
function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  );
}

/** One label/value row in the footprint card (mirrors `SummaryRow` on the booking detail page). */
function FootprintRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="text-right text-sm font-medium">{value}</dd>
    </div>
  );
}

/** Two-letter fallback from the full name, or the email when no name is set (mirrors `NavUser`). */
function initialsFor(fullName: string | null, email: string): string {
  const source = fullName?.trim() || email;
  return (source.slice(0, 2) || 'AD').toUpperCase();
}

interface UserDetailProps {
  detail: AdminUserDetail;
}

/**
 * Shared presentation for a user's detail page (`/users/[id]` and `/users/me`) — layout mirrors the
 * booking detail page (back link · header · `Card` + local `Fact` helper pattern). Server-renderable;
 * the destructive controls (role change, delete) live in the client-only `DangerZone` child.
 */
export function UserDetail({ detail }: UserDetailProps) {
  const displayName = detail.fullName?.trim() || detail.email;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 lg:px-6">
      <Link
        href="/users"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-4" />
        Back to users
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-center gap-4">
        <Avatar className="size-14 rounded-lg">
          {detail.avatarUrl ? <AvatarImage src={detail.avatarUrl} alt={displayName} /> : null}
          <AvatarFallback className="rounded-lg text-base">
            {initialsFor(detail.fullName, detail.email)}
          </AvatarFallback>
        </Avatar>
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-2xl font-bold tracking-tight">{displayName}</h1>
            <Badge variant={detail.role === 'ADMIN' ? 'default' : 'outline'} className="gap-1.5">
              <span className="size-1.5 rounded-full bg-current opacity-70" aria-hidden />
              {detail.role === 'ADMIN' ? 'Admin' : 'Customer'}
            </Badge>
            {detail.isEnvAdmin ? <Badge variant="outline">Env admin</Badge> : null}
            {detail.isSelf ? <Badge variant="outline">You</Badge> : null}
          </div>
          <p className="text-muted-foreground text-sm">{detail.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <Fact label="Phone" value={detail.phone ?? '—'} />
              <Fact label="Locale" value={detail.locale} />
              <Fact label="Joined" value={formatDate(detail.createdAt)} />
              <Fact label="Updated" value={formatDate(detail.updatedAt)} />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Footprint</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              <FootprintRow
                label="Bookings"
                value={
                  detail.counts.bookings > 0 ? (
                    <Link
                      href={`/bookings?userId=${detail.id}`}
                      className="text-primary hover:underline"
                    >
                      {detail.counts.bookings} · View bookings
                    </Link>
                  ) : (
                    detail.counts.bookings
                  )
                }
              />
              <FootprintRow
                label="Reviews"
                value={
                  detail.counts.reviews > 0 ? (
                    <Link href="/reviews" className="text-primary hover:underline">
                      {detail.counts.reviews} · View reviews
                    </Link>
                  ) : (
                    detail.counts.reviews
                  )
                }
              />
              <FootprintRow label="Wishlist" value={detail.counts.wishlist} />
            </dl>
          </CardContent>
        </Card>
      </div>

      <DangerZone detail={detail} />
    </div>
  );
}

export default UserDetail;
