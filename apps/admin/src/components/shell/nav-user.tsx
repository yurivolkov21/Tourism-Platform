'use client';

import Link from 'next/link';
import { ChevronsUpDown, CircleUser, LogOut } from 'lucide-react';

import {
  Avatar,
  AvatarFallback,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  SidebarMenu,
  SidebarMenuItem,
} from '@tourism/ui';

import { signOut } from '../../lib/auth/actions';

/**
 * Sidebar-footer account block (shadcn dashboard-01 pattern): a full-width row
 * with avatar + email and a dropdown (account + sign-out).
 *
 * Base UI gotchas this avoids (both crash the page — Base UI error #31 / missing
 * MenuGroupContext): a `Menu.Item` may NOT `render` a native `<button>` while its
 * default `nativeButton` is false, so sign-out is a plain item with `onClick`
 * (not a `<form action>` + submit button); and `DropdownMenuLabel` is a group
 * part that must live inside a `<DropdownMenuGroup>`, so the header is a plain div.
 */
export function NavUser({ email }: { email: string }) {
  const initials = (email.slice(0, 2) || 'AD').toUpperCase();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                aria-label="Account menu"
                className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-popup-open:bg-sidebar-accent flex w-full cursor-pointer items-center gap-2 rounded-lg p-2 text-left outline-none transition-colors"
              />
            }
          >
            <Avatar className="size-8 rounded-lg">
              <AvatarFallback className="rounded-lg text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 leading-tight">
              <span className="truncate text-sm font-medium">Administrator</span>
              <span className="text-muted-foreground truncate text-xs">{email}</span>
            </div>
            <ChevronsUpDown className="text-muted-foreground ml-auto size-4 shrink-0" />
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" side="right" sideOffset={8} className="w-56 rounded-lg">
            {/* Header is a plain div — DropdownMenuLabel requires a Group ancestor. */}
            <div className="flex items-center gap-2 px-1 py-1.5 text-left">
              <Avatar className="size-8 rounded-lg">
                <AvatarFallback className="rounded-lg text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 leading-tight">
                <span className="truncate text-sm font-medium">Administrator</span>
                <span className="text-muted-foreground truncate text-xs">{email}</span>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {/* Account → the caller's own user detail page (`/users/me`). Notifications dropped —
                  dashboard-01 parity isn't worth a permanently-disabled dead item. */}
              <DropdownMenuItem render={<Link href="/users/me" />} nativeButton={false}>
                <CircleUser className="size-4" />
                Account
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => {
                void signOut();
              }}
            >
              <LogOut className="size-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export default NavUser;
