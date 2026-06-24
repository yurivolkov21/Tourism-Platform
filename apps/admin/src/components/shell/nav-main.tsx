'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  cn,
} from '@tourism/ui';

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  soon?: boolean;
}
export interface NavSection {
  label: string;
  items: NavItem[];
}

/** Sidebar navigation — sections + items; the active item is brand-emerald, "soon" items disabled. */
export function NavMain({ sections }: { sections: NavSection[] }) {
  const pathname = usePathname();

  return (
    <>
      {sections.map((section) => (
        <SidebarGroup key={section.label} className="p-0 pt-4 first:pt-0">
          <SidebarGroupLabel className="text-muted-foreground/80 px-3 text-xs font-semibold tracking-wide uppercase">
            {section.label}
          </SidebarGroupLabel>
          <SidebarMenu>
            {section.items.map((item) => {
              const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
              return (
                <SidebarMenuItem key={item.title}>
                  {item.soon ? (
                    <SidebarMenuButton
                      disabled
                      tooltip={`${item.title} — coming soon`}
                      className="cursor-not-allowed opacity-50"
                    >
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  ) : (
                    <SidebarMenuButton
                      isActive={active}
                      tooltip={item.title}
                      className={cn(
                        'rounded-lg',
                        active &&
                          'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
                      )}
                      render={<Link href={item.href} />}
                    >
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </>
  );
}

export default NavMain;
