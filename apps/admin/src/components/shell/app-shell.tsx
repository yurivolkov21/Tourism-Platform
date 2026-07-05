'use client';

import { usePathname } from 'next/navigation';
import {
  Compass,
  FileText,
  ImageIcon,
  Inbox,
  LayoutDashboard,
  MailPlus,
  MailWarning,
  MapPin,
  MessageSquareQuote,
  Receipt,
  Tags,
  UsersRound,
} from 'lucide-react';

import {
  ScrollArea,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  ThemeToggle,
} from '@tourism/ui';

import { Logo } from '../brand/logo';
import { NavMain, type NavSection } from './nav-main';
import { NavUser } from './nav-user';

const NAV: NavSection[] = [
  { label: 'Overview', items: [{ title: 'Dashboard', href: '/', icon: LayoutDashboard }] },
  {
    label: 'Catalog',
    items: [
      { title: 'Destinations', href: '/destinations', icon: MapPin },
      { title: 'Tours', href: '/tours', icon: Compass },
      { title: 'Categories', href: '/categories', icon: Tags },
      { title: 'Media', href: '/media', icon: ImageIcon },
      { title: 'Posts', href: '/posts', icon: FileText },
      { title: 'Reviews', href: '/reviews', icon: MessageSquareQuote },
    ],
  },
  {
    label: 'Operations',
    items: [
      { title: 'Bookings', href: '/bookings', icon: Receipt },
      { title: 'Enquiries', href: '/enquiries', icon: Inbox },
      { title: 'Subscribers', href: '/subscribers', icon: MailPlus },
      { title: 'Users', href: '/users', icon: UsersRound },
      { title: 'Email queue', href: '/outbox', icon: MailWarning },
    ],
  },
];

const TOGGLE_CLASS =
  'text-muted-foreground hover:bg-muted hover:text-primary inline-flex size-9 cursor-pointer items-center justify-center rounded-full transition-colors [&_svg]:size-5';

/** Resolve the current page title from the nav (longest matching href wins). */
function usePageTitle(): string {
  const pathname = usePathname();
  const items = NAV.flatMap((s) => s.items);
  const match = items
    .filter((i) => (i.href === '/' ? pathname === '/' : pathname.startsWith(i.href)))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return match?.title ?? 'Console';
}

/** Admin app shell: inset brand sidebar (nav + account) + a sticky topbar (trigger · title · theme). */
export function AppShell({ email, children }: { email: string; children: React.ReactNode }) {
  const title = usePageTitle();

  return (
    <SidebarProvider>
      <Sidebar variant="inset">
        <SidebarHeader className="px-3 py-3.5">
          <Logo className="text-[1.35rem]" />
        </SidebarHeader>
        <SidebarContent className="px-2">
          <ScrollArea className="h-full px-2">
            <NavMain sections={NAV} />
          </ScrollArea>
        </SidebarContent>
        <SidebarFooter>
          <NavUser email={email} />
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="bg-background sticky top-0 z-30 flex h-14 items-center gap-2 rounded-t-xl border-b px-4 sm:px-6">
          <SidebarTrigger className="text-muted-foreground -ml-1 cursor-pointer" />
          <span className="bg-border mx-1 h-4 w-px" aria-hidden />
          <h1 className="font-heading text-sm font-semibold">{title}</h1>
          <div className="ml-auto flex items-center gap-1.5">
            <ThemeToggle className={TOGGLE_CLASS} />
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default AppShell;
