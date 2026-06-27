'use client';

import Link from 'next/link';
import { CircleUserRoundIcon, LogOutIcon, TicketIcon, UserIcon } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  cn,
} from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { useAuth } from './auth-provider';
import { useSignOut } from './use-sign-out';

/**
 * Navbar auth control: logged-out → a "Log in" link styled like the other nav links; logged-in → an
 * account dropdown (email · My account · Sign out). Reads state from the client AuthProvider.
 */
export function UserMenu({ linkClassName }: { linkClassName?: string }) {
  const { user, loading } = useAuth();
  const signOut = useSignOut();
  const t = messages.auth.menu;
  const fullName =
    user && typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : '';

  if (loading || !user) {
    return (
      <Link href="/login" className={linkClassName}>
        {t.login}
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label={t.account}
            className={cn(
              'text-muted-foreground hover:text-foreground hover:bg-muted inline-flex size-9 cursor-pointer items-center justify-center rounded-full transition-colors',
            )}
          />
        }
      >
        <CircleUserRoundIcon className="size-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          {fullName ? <p className="truncate text-sm font-medium">{fullName}</p> : null}
          <p className="text-muted-foreground truncate text-xs">{user.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/account" />} nativeButton={false}>
          <UserIcon className="size-4" />
          {t.account}
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/account/bookings" />} nativeButton={false}>
          <TicketIcon className="size-4" />
          {messages.booking.list.menuLink}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            void signOut();
          }}
        >
          <LogOutIcon className="size-4" />
          {t.signOut}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default UserMenu;
