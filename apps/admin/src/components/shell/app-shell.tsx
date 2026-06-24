import {
  CalendarRange,
  Compass,
  FileText,
  ImageIcon,
  LayoutDashboard,
  MapPin,
  Tags,
} from 'lucide-react';

import {
  ScrollArea,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  ThemeToggle,
} from '@tourism/ui';

import { NavMain, type NavSection } from './nav-main';
import { UserMenu } from './user-menu';

const NAV: NavSection[] = [
  { label: 'Overview', items: [{ title: 'Dashboard', href: '/', icon: LayoutDashboard }] },
  {
    label: 'Catalog',
    items: [
      { title: 'Destinations', href: '/destinations', icon: MapPin },
      { title: 'Tours', href: '/tours', icon: Compass, soon: true },
      { title: 'Categories', href: '/categories', icon: Tags, soon: true },
      { title: 'Departures', href: '/departures', icon: CalendarRange, soon: true },
      { title: 'Media', href: '/media', icon: ImageIcon, soon: true },
      { title: 'Posts', href: '/posts', icon: FileText, soon: true },
    ],
  },
];

const TOGGLE_CLASS =
  'text-muted-foreground hover:bg-muted hover:text-primary inline-flex size-9 cursor-pointer items-center justify-center rounded-full transition-colors [&_svg]:size-5';

/** Admin app shell: brand sidebar (nav) + a sticky topbar (trigger · theme · account). */
export function AppShell({ email, children }: { email: string; children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="px-4 py-4">
          <div className="flex items-center gap-2.5">
            <span className="bg-primary text-primary-foreground font-heading flex size-8 items-center justify-center rounded-md text-sm font-bold tracking-tight">
              TP
            </span>
            <span className="font-heading text-base font-semibold">Tourism Admin</span>
          </div>
        </SidebarHeader>
        <SidebarContent className="px-2">
          <ScrollArea className="h-full px-2">
            <NavMain sections={NAV} />
          </ScrollArea>
        </SidebarContent>
      </Sidebar>

      <SidebarInset>
        <header className="bg-background sticky top-0 z-30 flex h-14 items-center gap-3 border-b px-4 sm:px-6">
          <SidebarTrigger className="-ml-1 cursor-pointer" />
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle className={TOGGLE_CLASS} />
            <UserMenu email={email} />
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default AppShell;
