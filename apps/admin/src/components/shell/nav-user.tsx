'use client';

import { Bell, ChevronsUpDown, CircleUser, LogOut } from 'lucide-react';

import {
  Avatar,
  AvatarFallback,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  SidebarMenu,
  SidebarMenuItem,
} from '@tourism/ui';

import { signOut } from '../../lib/auth/actions';

/**
 * Sidebar-footer account block (shadcn dashboard-01 pattern): a full-width row
 * with avatar + email and a dropdown (account/notifications + sign-out).
 *
 * The trigger is a plain `<button type="button">` via Base UI's `render` prop —
 * NOT a `<SidebarMenuButton>`. Composing two `useRender` layers (Menu.Trigger +
 * SidebarMenuButton) dropped the open-on-click wiring, so the row navigated
 * instead of opening the menu. This flat pattern matches the rest of the app.
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
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left">
                <Avatar className="size-8 rounded-lg">
                  <AvatarFallback className="rounded-lg text-xs">{initials}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 leading-tight">
                  <span className="truncate text-sm font-medium">Administrator</span>
                  <span className="text-muted-foreground truncate text-xs">{email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {/* Not wired yet — shown for parity with dashboard-01, disabled so they never 404. */}
              <DropdownMenuItem disabled>
                <CircleUser className="size-4" />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <Bell className="size-4" />
                Notifications
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <form action={signOut}>
              <DropdownMenuItem
                variant="destructive"
                render={<button type="submit" className="w-full cursor-pointer" />}
              >
                <LogOut className="size-4" />
                Log out
              </DropdownMenuItem>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export default NavUser;
