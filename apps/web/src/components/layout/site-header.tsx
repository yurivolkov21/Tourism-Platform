'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRightIcon, MenuIcon } from 'lucide-react';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  ThemeToggle,
  buttonVariants,
  cn,
} from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { Logo } from '../brand/logo';
import { UserMenu } from '../auth/user-menu';
import { useAuth } from '../auth/auth-provider';
import { useSignOut } from '../auth/use-sign-out';
import { TopBar } from './top-bar';

// Hover-pill links (borrowed from shadcnspace Navbar 01): each item lifts into a
// soft pill on hover instead of just changing colour.
const linkClass =
  'text-muted-foreground hover:text-foreground hover:bg-muted rounded-full px-3 py-1.5 text-sm font-medium transition-colors';

const toggleClass =
  'text-muted-foreground hover:bg-muted hover:text-primary inline-flex size-9 cursor-pointer items-center justify-center rounded-full transition-colors [&_svg]:size-5';

// Flat nav for the mobile dropdown — expands Destinations into its region pages.
const mobileNav = [
  { label: messages.nav.tours, href: '/tours' },
  ...messages.nav.destinationsMenu.items.map((i) => ({ label: i.label, href: i.href })),
  { label: messages.nav.about, href: '/about' },
  { label: messages.nav.contact, href: '/contact' },
];

// Animated "Plan your trip" CTA (borrowed from shadcnspace Navbar 01): the arrow
// disc slides across and rotates on hover. Motion gated behind motion-safe.
function PlanTripButton({ label, className }: { label: string; className?: string }) {
  return (
    <a
      href="#contact"
      className={cn(
        'bg-primary text-primary-foreground group relative inline-flex h-10 items-center overflow-hidden rounded-full pe-12 ps-5 text-sm font-medium hover:bg-primary/90 motion-safe:transition-all motion-safe:duration-500 motion-safe:hover:pe-5 motion-safe:hover:ps-12',
        className,
      )}
    >
      <span className="relative z-10">{label}</span>
      <span className="bg-background text-foreground absolute right-1 flex size-8 items-center justify-center rounded-full motion-safe:transition-all motion-safe:duration-500 motion-safe:group-hover:right-[calc(100%-2.25rem)] motion-safe:group-hover:rotate-45">
        <ArrowUpRightIcon className="size-4" />
      </span>
    </a>
  );
}

export function SiteHeader() {
  const t = messages.nav;
  const { user } = useAuth();
  const signOut = useSignOut();

  // #1 Pill-on-scroll: past 50px the bar contracts into a floating glass pill.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <TopBar />

      <header
        className={cn(
          'sticky top-0 z-50 motion-safe:transition-all motion-safe:duration-500',
          scrolled ? 'py-2' : 'bg-background border-b',
        )}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div
            className={cn(
              'flex items-center justify-between gap-6 motion-safe:transition-all motion-safe:duration-500',
              scrolled
                ? 'border-border/40 bg-background/70 h-14 rounded-full border px-4 shadow-lg shadow-primary/5 backdrop-blur-lg sm:px-6'
                : 'h-16',
            )}
          >
          <a href="/" aria-label={messages.brand.name}>
            <Logo />
          </a>

          {/* Desktop nav */}
          <nav className="flex items-center gap-1 max-md:hidden" aria-label="Primary">
            <NavigationMenu>
              <NavigationMenuList>
                {[t.toursMenu, t.destinationsMenu].map((menu) => (
                  <NavigationMenuItem key={menu.label}>
                    <NavigationMenuTrigger>{menu.label}</NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <ul className="grid w-md grid-cols-2 gap-1 p-2">
                        {menu.items.map((item) => (
                          <li key={item.label}>
                            <NavigationMenuLink render={<a href={item.href} />}>
                              <div className="flex flex-col gap-0.5">
                                <span className="font-medium">{item.label}</span>
                                <span className="text-muted-foreground text-xs">{item.hint}</span>
                              </div>
                            </NavigationMenuLink>
                          </li>
                        ))}
                      </ul>
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                ))}
              </NavigationMenuList>
            </NavigationMenu>

            <a href="/about" className={linkClass}>
              {t.about}
            </a>
            <a href="/contact" className={linkClass}>
              {t.contact}
            </a>
          </nav>

          {/* Desktop actions */}
          <div className="flex items-center gap-4 max-md:hidden">
            <ThemeToggle className={toggleClass} />
            <UserMenu linkClassName={linkClass} />
            <PlanTripButton label={t.planTrip} />
          </div>

          {/* Mobile actions */}
          <div className="flex items-center gap-3 md:hidden">
            <ThemeToggle className={toggleClass} />
            <a
              href="#contact"
              className={cn(buttonVariants({ size: 'default' }), 'max-[400px]:hidden')}
            >
              {t.planTrip}
            </a>
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" size="icon-lg" />}>
                <MenuIcon />
                <span className="sr-only">{t.menu}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                {mobileNav.map((item) => (
                  <DropdownMenuItem key={item.label} render={<a href={item.href} />}>
                    {item.label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                {user ? (
                  <>
                    <DropdownMenuItem render={<a href="/account" />}>
                      {messages.auth.menu.account}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        void signOut();
                      }}
                    >
                      {messages.auth.menu.signOut}
                    </DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem render={<a href="/login" />}>
                    {messages.auth.menu.login}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          </div>
        </div>
      </header>
    </>
  );
}

export default SiteHeader;
