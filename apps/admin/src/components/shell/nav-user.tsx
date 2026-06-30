'use client';

import { ChevronsUpDown, LogOut } from 'lucide-react';

import {
  Avatar,
  AvatarFallback,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@tourism/ui';

import { signOut } from '../../lib/auth/actions';

/**
 * Sidebar-footer account block (dashboard-01 pattern): a large menu button with
 * the admin's avatar + email and a dropdown for sign-out. Built on @tourism/ui
 * (Base UI `render` prop, not Radix `asChild`).
 */
export function NavUser({ email }: { email: string }) {
  const initials = (email.slice(0, 2) || 'AD').toUpperCase();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground cursor-pointer"
              />
            }
          >
            <Avatar className="size-8 rounded-lg">
              <AvatarFallback className="rounded-lg text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">Administrator</span>
              <span className="text-muted-foreground truncate text-xs">{email}</span>
            </div>
            <ChevronsUpDown className="ml-auto size-4" />
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" side="right" sideOffset={8} className="w-56">
            <DropdownMenuLabel className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">Signed in</span>
              <span className="text-muted-foreground truncate text-xs">{email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <form action={signOut}>
              <DropdownMenuItem
                variant="destructive"
                render={<button type="submit" className="w-full cursor-pointer" />}
              >
                <LogOut className="size-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export default NavUser;
